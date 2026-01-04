import {DOMParser, XMLSerializer} from '@xmldom/xmldom'
import {spawn} from 'node:child_process'
import {dirname, extname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import xpath from 'xpath'

import type {FileVersions} from '../diff/parser.js'

// Lazy-loaded tree-sitter module
type TreeSitterType = typeof import('web-tree-sitter')
let TreeSitterModule: null | TreeSitterType = null

async function getTreeSitter(): Promise<TreeSitterType> {
  if (!TreeSitterModule) {
    TreeSitterModule = await import('web-tree-sitter')
  }

  return TreeSitterModule
}

// Track initialization state
let treeSitterInitialized = false

// Language WASM file mappings
const LANGUAGE_WASM_MAP: Record<string, string> = {
  '.c': 'tree-sitter-c/tree-sitter-c.wasm',
  '.cpp': 'tree-sitter-cpp/tree-sitter-cpp.wasm',
  '.cxx': 'tree-sitter-cpp/tree-sitter-cpp.wasm',
  '.go': 'tree-sitter-go/tree-sitter-go.wasm',
  '.h': 'tree-sitter-c/tree-sitter-c.wasm',
  '.hpp': 'tree-sitter-cpp/tree-sitter-cpp.wasm',
  '.java': 'tree-sitter-java/tree-sitter-java.wasm',
  '.js': 'tree-sitter-javascript/tree-sitter-javascript.wasm',
  '.json': 'tree-sitter-json/tree-sitter-json.wasm',
  '.jsx': 'tree-sitter-javascript/tree-sitter-javascript.wasm',
  '.mjs': 'tree-sitter-javascript/tree-sitter-javascript.wasm',
  '.py': 'tree-sitter-python/tree-sitter-python.wasm',
  '.rs': 'tree-sitter-rust/tree-sitter-rust.wasm',
  '.ts': 'tree-sitter-typescript/tree-sitter-typescript.wasm',
  '.tsx': 'tree-sitter-typescript/tree-sitter-tsx.wasm',
}

// Cache loaded languages
const languageCache = new Map<string, import('web-tree-sitter').Language>()

export interface FilterResult {
  diffText: string
  left: {
    artifact: string
  }
  right: {
    artifact: string
  }
}

export interface Filter {
  args: string[]
  type: string
}

/**
 * Run a command with stdin input and return stdout.
 */
function runWithStdin(command: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else if (stdout) {
        // Some tools (like jq) return non-zero for certain operations
        // but still produce valid output
        resolve(stdout)
      } else {
        reject(new Error(`${command} exited with code ${code}: ${stderr}`))
      }
    })

    proc.on('error', reject)

    proc.stdin.write(input)
    proc.stdin.end()
  })
}

/**
 * Run jq with the given args on the input content.
 */
async function runJq(content: string, args: string[]): Promise<string> {
  return runWithStdin('jq', args, content)
}

/**
 * Create diff text between two artifacts using temp files.
 */
async function createDiffText(left: string, right: string): Promise<string> {
  const {unlink, writeFile} = await import('node:fs/promises')
  const {tmpdir} = await import('node:os')
  const {join} = await import('node:path')
  const {randomBytes} = await import('node:crypto')

  const id = randomBytes(8).toString('hex')
  const leftPath = join(tmpdir(), `makesure-left-${id}`)
  const rightPath = join(tmpdir(), `makesure-right-${id}`)

  await writeFile(leftPath, left)
  await writeFile(rightPath, right)

  try {
    const result = await new Promise<string>((resolve) => {
      const proc = spawn('diff', ['-u', leftPath, rightPath])
      let stdout = ''

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.on('close', () => {
        // diff returns 1 when files differ, which is expected
        resolve(stdout)
      })

      proc.on('error', () => {
        resolve('')
      })
    })
    return result
  } finally {
    await unlink(leftPath).catch(() => {})
    await unlink(rightPath).catch(() => {})
  }
}

/**
 * Apply a jq filter to file versions and return the filter result.
 */
export async function applyJqFilter(
  versions: FileVersions,
  args: string[],
): Promise<FilterResult | null> {
  // If both are null, nothing to filter
  if (versions.oldContent === null && versions.newContent === null) {
    return null
  }

  const leftArtifact = versions.oldContent ? await runJq(versions.oldContent, args) : ''
  const rightArtifact = versions.newContent ? await runJq(versions.newContent, args) : ''

  // If artifacts are the same, no meaningful diff after filtering
  if (leftArtifact === rightArtifact) {
    return null
  }

  const diffText = await createDiffText(leftArtifact, rightArtifact)

  return {
    diffText,
    left: {artifact: leftArtifact},
    right: {artifact: rightArtifact},
  }
}

/**
 * Apply a regex filter to extract matching lines from content.
 * Args: [pattern, flags?]
 * - pattern: The regex pattern to match
 * - flags: Optional regex flags (e.g., 'i' for case-insensitive, 'g' is always applied)
 */
export async function applyRegexFilter(
  versions: FileVersions,
  args: string[],
): Promise<FilterResult | null> {
  if (args.length === 0) {
    throw new Error('Regex filter requires at least a pattern argument')
  }

  const [pattern, flags = ''] = args
  // Always include 'g' flag for global matching, and 'm' for multiline
  const regex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}gm`)

  const extractMatches = (content: null | string): string => {
    if (!content) return ''
    const matches = content.match(regex)
    return matches ? matches.join('\n') : ''
  }

  // If both are null, nothing to filter
  if (versions.oldContent === null && versions.newContent === null) {
    return null
  }

  const leftArtifact = extractMatches(versions.oldContent)
  const rightArtifact = extractMatches(versions.newContent)

  // If artifacts are the same, no meaningful diff after filtering
  if (leftArtifact === rightArtifact) {
    return null
  }

  const diffText = await createDiffText(leftArtifact, rightArtifact)

  return {
    diffText,
    left: {artifact: leftArtifact},
    right: {artifact: rightArtifact},
  }
}

/**
 * Apply an XPath filter to extract matching nodes from XML/HTML content.
 * Args: [expression, namespaces?]
 * - expression: The XPath expression to evaluate
 * - namespaces: Optional JSON object mapping prefixes to namespace URIs
 */
export async function applyXpathFilter(
  versions: FileVersions,
  args: string[],
): Promise<FilterResult | null> {
  if (args.length === 0) {
    throw new Error('XPath filter requires at least an expression argument')
  }

  const [expression, namespacesJson] = args
  const namespaces = namespacesJson ? JSON.parse(namespacesJson) as Record<string, string> : undefined

  const extractNodes = (content: null | string): string => {
    if (!content) return ''

    try {
      const doc = new DOMParser().parseFromString(content, 'text/xml')
      const select = namespaces ? xpath.useNamespaces(namespaces) : xpath.select
      const nodes = select(expression, doc)

      if (!nodes || (Array.isArray(nodes) && nodes.length === 0)) {
        return ''
      }

      // Handle different result types
      if (typeof nodes === 'string' || typeof nodes === 'number' || typeof nodes === 'boolean') {
        return String(nodes)
      }

      const serializer = new XMLSerializer()
      return (nodes as {nodeType?: number}[]).map((node) => {
        if ('nodeType' in node) {
          // Element or text node
          return serializer.serializeToString(node as unknown as globalThis.Node)
        }

        return String(node)
      }).join('\n')
    } catch {
      // If parsing fails, return empty
      return ''
    }
  }

  // If both are null, nothing to filter
  if (versions.oldContent === null && versions.newContent === null) {
    return null
  }

  const leftArtifact = extractNodes(versions.oldContent)
  const rightArtifact = extractNodes(versions.newContent)

  // If artifacts are the same, no meaningful diff after filtering
  if (leftArtifact === rightArtifact) {
    return null
  }

  const diffText = await createDiffText(leftArtifact, rightArtifact)

  return {
    diffText,
    left: {artifact: leftArtifact},
    right: {artifact: rightArtifact},
  }
}

/**
 * Initialize tree-sitter if not already initialized.
 */
async function initTreeSitter(): Promise<TreeSitterType> {
  const ts = await getTreeSitter()

  if (!treeSitterInitialized) {
    // Locate the tree-sitter WASM file
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const wasmPath = join(__dirname, '../../../node_modules/web-tree-sitter/web-tree-sitter.wasm')

    // Parser has a static init method
    await ts.Parser.init({
      locateFile: () => wasmPath,
    })
    treeSitterInitialized = true
  }

  return ts
}

/**
 * Get or load a tree-sitter language for the given file extension.
 */
async function getLanguageForExtension(ext: string, ts: TreeSitterType): Promise<import('web-tree-sitter').Language | null> {
  const wasmRelPath = LANGUAGE_WASM_MAP[ext.toLowerCase()]
  if (!wasmRelPath) return null

  // Check cache first
  if (languageCache.has(wasmRelPath)) {
    return languageCache.get(wasmRelPath)!
  }

  // Load the language WASM file
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const wasmPath = join(__dirname, '../../../node_modules', wasmRelPath)

  try {
    const language = await ts.Language.load(wasmPath)
    languageCache.set(wasmRelPath, language)
    return language
  } catch {
    return null
  }
}

/**
 * Apply a tree-sitter query filter to extract matching nodes from source code.
 * Args: [query, captureName?, fileExtension?]
 * - query: The tree-sitter query pattern (S-expression)
 * - captureName: Optional capture name to extract (defaults to all captures)
 * - fileExtension: Optional file extension override for language detection
 *
 * The query uses tree-sitter's query syntax, e.g.:
 * - "(function_declaration) @fn" to match all function declarations
 * - "(class_declaration name: (identifier) @class-name)" to match class names
 * - "((call_expression function: (identifier) @fn-name) (#eq? @fn-name \"console.log\"))" to match console.log calls
 */
export async function applyTsqFilter(
  versions: FileVersions,
  args: string[],
  filePath?: string,
): Promise<FilterResult | null> {
  if (args.length === 0) {
    throw new Error('TSQ filter requires at least a query argument')
  }

  const [queryString, captureName, fileExtOverride] = args

  // Determine file extension for language detection
  const ext = fileExtOverride || (filePath ? extname(filePath) : null)
  if (!ext) {
    throw new Error('TSQ filter requires a file extension (either from file path or as third argument)')
  }

  // Initialize tree-sitter and get module
  const ts = await initTreeSitter()

  // Get the language
  const language = await getLanguageForExtension(ext, ts)
  if (!language) {
    throw new Error(`Unsupported language for extension: ${ext}`)
  }

  // Get Parser and Query constructors from ts module
   
  const {Parser, Query} = ts

  const extractNodes = (content: null | string): string => {
    if (!content) return ''

    try {
      const parser = new Parser()
      parser.setLanguage(language)

      const tree = parser.parse(content)
      if (!tree) return ''

      const query = new Query(language, queryString)
      const captures = query.captures(tree.rootNode)

      // Filter by capture name if specified
      const filteredCaptures = captureName
        ? captures.filter((c) => c.name === captureName)
        : captures

      // Extract unique node texts (deduplicate by node id)
      const seen = new Set<number>()
      const nodeTexts: string[] = []

      for (const capture of filteredCaptures) {
        if (!seen.has(capture.node.id)) {
          seen.add(capture.node.id)
          nodeTexts.push(capture.node.text)
        }
      }

      // Clean up
      query.delete()
      tree.delete()
      parser.delete()

      return nodeTexts.join('\n\n')
    } catch {
      // If parsing or query fails, return empty
      return ''
    }
  }

  // If both are null, nothing to filter
  if (versions.oldContent === null && versions.newContent === null) {
    return null
  }

  const leftArtifact = extractNodes(versions.oldContent)
  const rightArtifact = extractNodes(versions.newContent)

  // If artifacts are the same, no meaningful diff after filtering
  if (leftArtifact === rightArtifact) {
    return null
  }

  const diffText = await createDiffText(leftArtifact, rightArtifact)

  return {
    diffText,
    left: {artifact: leftArtifact},
    right: {artifact: rightArtifact},
  }
}

/**
 * Apply a filter to file versions based on filter type.
 */
export async function applyFilter(
  filter: Filter,
  versions: FileVersions,
  filePath?: string,
): Promise<FilterResult | null> {
  switch (filter.type) {
    case 'jq': {
      return applyJqFilter(versions, filter.args)
    }

    case 'regex': {
      return applyRegexFilter(versions, filter.args)
    }

    case 'tsq': {
      return applyTsqFilter(versions, filter.args, filePath)
    }

    case 'xpath': {
      return applyXpathFilter(versions, filter.args)
    }

    default: {
      throw new Error(`Unsupported filter type: ${filter.type}`)
    }
  }
}
