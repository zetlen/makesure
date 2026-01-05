import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

// Lazy-loaded tree-sitter module
type TreeSitterType = typeof import('web-tree-sitter')
let TreeSitterModule: null | TreeSitterType = null

export async function getTreeSitter(): Promise<TreeSitterType> {
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

export type SupportedExtension = keyof typeof LANGUAGE_WASM_MAP

// Cache loaded languages
const languageCache = new Map<string, import('web-tree-sitter').Language>()

/**
 * Initialize tree-sitter if not already initialized.
 */
export async function initTreeSitter(): Promise<TreeSitterType> {
  const ts = await getTreeSitter()

  if (!treeSitterInitialized) {
    // Locate the tree-sitter WASM file
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const wasmPath = join(__dirname, '../../node_modules/web-tree-sitter/web-tree-sitter.wasm')

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
export async function getLanguageForExtension(
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
  const wasmPath = join(__dirname, '../../node_modules', wasmRelPath)

  try {
    const language = await ts.Language.load(wasmPath)
    languageCache.set(wasmRelPath, language)
    return language
  } catch {
    return null
  }
}
