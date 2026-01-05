import {dirname, extname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import type {FileVersions} from '../diff/parser.js'
import type {FilterApplier, FilterResult} from './types.js'

import {createDiffText} from './utils.js'

/**
 * Supported file extensions for tree-sitter language detection.
 */
export type TsqSupportedExtension =
  | '.c'
  | '.cpp'
  | '.cxx'
  | '.go'
  | '.h'
  | '.hpp'
  | '.java'
  | '.js'
  | '.json'
  | '.jsx'
  | '.mjs'
  | '.py'
  | '.rs'
  | '.ts'
  | '.tsx'

/**
 * Configuration for the tsq (tree-sitter query) filter.
 * Extracts AST nodes from source code using tree-sitter's S-expression query syntax.
 * This enables language-aware code analysis for tracking changes to specific code constructs.
 *
 * @example
 * ```yaml
 * # Find all function declarations in JavaScript
 * filters:
 *   - type: tsq
 *     query: "(function_declaration) @fn"
 * ```
 *
 * @example
 * ```yaml
 * # Extract just the function names
 * filters:
 *   - type: tsq
 *     query: "(function_declaration name: (identifier) @name)"
 *     capture: "name"
 * ```
 *
 * @example
 * ```yaml
 * # Find Python class definitions with explicit language
 * filters:
 *   - type: tsq
 *     query: "(class_definition name: (identifier) @class)"
 *     capture: "class"
 *     language: ".py"
 * ```
 */
export interface TsqFilterConfig {
  /**
   * Optional capture name to filter results.
   * When specified, only nodes matching this capture name will be extracted.
   * If omitted, all captures from the query will be included.
   *
   * @example "fn"
   * @example "class-name"
   * @example "method"
   */
  capture?: string

  /**
   * Optional file extension to override language detection.
   * By default, the language is detected from the file being processed.
   * Use this when processing files with non-standard extensions.
   *
   * Supported extensions: .js, .jsx, .mjs, .ts, .tsx, .py, .go, .java, .rs, .c, .h, .cpp, .cxx, .hpp, .json
   *
   * @example ".js"
   * @example ".py"
   * @example ".ts"
   */
  language?: TsqSupportedExtension

  /**
   * The tree-sitter query pattern using S-expression syntax.
   * See https://tree-sitter.github.io/tree-sitter/using-parsers/queries for syntax reference.
   *
   * Common patterns:
   * - `(node_type) @capture` - Match a node type
   * - `(parent (child) @capture)` - Match nested structure
   * - `(node field: (child) @capture)` - Match by field name
   * - `((node) @n (#eq? @n "value"))` - Match with predicate
   *
   * @example "(function_declaration) @fn"
   * @example "(class_definition name: (identifier) @class-name)"
   * @example "(interface_declaration) @iface"
   */
  query: string

  /**
   * Discriminant tag identifying this as a tsq filter.
   */
  type: 'tsq'
}

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
async function getLanguageForExtension(
  ext: string,
  ts: TreeSitterType,
): Promise<import('web-tree-sitter').Language | null> {
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
 * Tree-sitter query filter for extracting AST nodes from source code.
 */
export const tsqFilter: FilterApplier<TsqFilterConfig> = {
  async apply(versions: FileVersions, config: TsqFilterConfig, filePath?: string): Promise<FilterResult | null> {
    const {capture, language: languageOverride, query: queryString} = config

    // Determine file extension for language detection
    const ext = languageOverride || (filePath ? extname(filePath) : null)
    if (!ext) {
      throw new Error('TSQ filter requires a file extension (either from file path or as "language" config property)')
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
        const filteredCaptures = capture ? captures.filter((c) => c.name === capture) : captures

        // Extract unique node texts (deduplicate by node id)
        const seen = new Set<number>()
        const nodeTexts: string[] = []

        for (const cap of filteredCaptures) {
          if (!seen.has(cap.node.id)) {
            seen.add(cap.node.id)
            nodeTexts.push(cap.node.text)
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
  },
}

/**
 * Apply a tree-sitter query filter to extract matching nodes from source code.
 * @deprecated Use tsqFilter.apply() with TsqFilterConfig instead
 */
export async function applyTsqFilter(
  versions: FileVersions,
  args: string[],
  filePath?: string,
): Promise<FilterResult | null> {
  if (args.length === 0) {
    throw new Error('TSQ filter requires at least a query argument')
  }

  const [query, capture, language] = args

  return tsqFilter.apply(
    versions,
    {
      capture,
      language: language as TsqSupportedExtension | undefined,
      query,
      type: 'tsq',
    },
    filePath,
  )
}
