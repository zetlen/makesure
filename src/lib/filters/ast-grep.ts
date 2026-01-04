import type {FileVersions} from '../diff/parser.js'
import type {BaseFilterConfig, FilterApplier, FilterResult} from './types.js'

import {createDiffText, runWithStdin} from './utils.js'

/**
 * Supported languages for ast-grep.
 * These correspond to the --lang flag values.
 */
export type AstGrepLanguage =
  | 'c'
  | 'cpp'
  | 'css'
  | 'go'
  | 'html'
  | 'java'
  | 'javascript'
  | 'json'
  | 'kotlin'
  | 'lua'
  | 'python'
  | 'rust'
  | 'scala'
  | 'swift'
  | 'tsx'
  | 'typescript'

/**
 * Map file extensions to ast-grep language names.
 */
const EXTENSION_TO_LANGUAGE: Record<string, AstGrepLanguage> = {
  '.c': 'c',
  '.cpp': 'cpp',
  '.css': 'css',
  '.cxx': 'cpp',
  '.go': 'go',
  '.h': 'c',
  '.hpp': 'cpp',
  '.html': 'html',
  '.java': 'java',
  '.js': 'javascript',
  '.json': 'json',
  '.jsx': 'javascript',
  '.kt': 'kotlin',
  '.lua': 'lua',
  '.mjs': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.scala': 'scala',
  '.swift': 'swift',
  '.ts': 'typescript',
  '.tsx': 'tsx',
}

/**
 * Configuration for the ast-grep filter.
 * Extracts AST nodes from source code using ast-grep's pattern syntax.
 * Patterns look like actual code with metavariables ($VAR) for wildcards.
 *
 * @example
 * ```yaml
 * # Find all console.log calls
 * filters:
 *   - type: ast-grep
 *     pattern: "console.log($$$ARGS)"
 *     language: javascript
 * ```
 *
 * @example
 * ```yaml
 * # Find function declarations (language inferred from file extension)
 * filters:
 *   - type: ast-grep
 *     pattern: "function $NAME($$$PARAMS) { $$$BODY }"
 * ```
 *
 * @example
 * ```yaml
 * # Find Python class definitions
 * filters:
 *   - type: ast-grep
 *     pattern: "class $NAME:"
 *     language: python
 * ```
 *
 * @example
 * ```yaml
 * # Find Go struct definitions with selector for precise matching
 * filters:
 *   - type: ast-grep
 *     pattern: "type $NAME struct { $$$FIELDS }"
 *     language: go
 *     selector: type_declaration
 * ```
 */
export interface AstGrepFilterConfig extends BaseFilterConfig {
  /**
   * The language to use for parsing.
   * If not specified, the language is inferred from the file extension.
   *
   * Supported languages: c, cpp, css, go, html, java, javascript, json,
   * kotlin, lua, python, rust, scala, swift, typescript, tsx
   *
   * @example "javascript"
   * @example "python"
   * @example "typescript"
   */
  language?: AstGrepLanguage

  /**
   * The pattern to match against the source code.
   * Uses ast-grep's pattern syntax which looks like actual code.
   *
   * Metavariables:
   * - `$VAR`: Matches any single AST node
   * - `$$$VAR`: Matches zero or more AST nodes (for sequences like arguments)
   *
   * @example "console.log($$$ARGS)"
   * @example "function $NAME($$$PARAMS) { $$$BODY }"
   * @example "import { $$$IMPORTS } from '$MODULE'"
   */
  pattern: string

  /**
   * Optional AST node kind to use as a selector for more precise matching.
   * When specified, only nodes of this kind that match the pattern are returned.
   * This is useful when a pattern might match unintended node types.
   *
   * @example "function_declaration"
   * @example "class_declaration"
   * @example "call_expression"
   */
  selector?: string

  /**
   * Discriminant tag identifying this as an ast-grep filter.
   */
  type: 'ast-grep'
}

/**
 * Get the ast-grep language from a file extension.
 */
function getLanguageFromExtension(filePath: string): AstGrepLanguage | null {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return EXTENSION_TO_LANGUAGE[ext] ?? null
}

/**
 * Parse ast-grep JSON output and extract matched text.
 */
function parseAstGrepOutput(jsonOutput: string): string[] {
  if (!jsonOutput.trim()) return []

  try {
    // ast-grep --json outputs a JSON array of match objects
    const results = JSON.parse(jsonOutput) as Array<{text?: string}>
    return results
      .filter((match): match is {text: string} => typeof match.text === 'string')
      .map((match) => match.text)
  } catch {
    // If parsing fails, return empty
    return []
  }
}

/**
 * ast-grep filter for extracting AST nodes using pattern matching.
 */
export const astGrepFilter: FilterApplier<AstGrepFilterConfig> = {
  async apply(versions: FileVersions, config: AstGrepFilterConfig, filePath?: string): Promise<FilterResult | null> {
    const {language: languageOverride, pattern, selector} = config

    // Determine language
    const language = languageOverride ?? (filePath ? getLanguageFromExtension(filePath) : null)
    if (!language) {
      throw new Error('ast-grep filter requires a language (either from file extension or as "language" config property)')
    }

    const extractNodes = async (content: null | string): Promise<string> => {
      if (!content) return ''

      try {
        // Build ast-grep command arguments
        const args = ['run', '--pattern', pattern, '--lang', language, '--json', '--stdin']

        if (selector) {
          args.push('--selector', selector)
        }

        const output = await runWithStdin('ast-grep', args, content)
        const matches = parseAstGrepOutput(output)

        // Deduplicate and join matches
        const uniqueMatches = [...new Set(matches)]
        return uniqueMatches.join('\n\n')
      } catch (error) {
        // Check if ast-grep is not installed
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
          throw new Error('ast-grep command not found. Please install it: https://ast-grep.github.io/guide/quick-start.html#installation')
        }

        // For other errors (like invalid patterns), return empty
        return ''
      }
    }

    // If both are null, nothing to filter
    if (versions.oldContent === null && versions.newContent === null) {
      return null
    }

    const [leftArtifact, rightArtifact] = await Promise.all([
      extractNodes(versions.oldContent),
      extractNodes(versions.newContent),
    ])

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
 * Apply an ast-grep filter to extract matching nodes from source code.
 * @deprecated Use astGrepFilter.apply() with AstGrepFilterConfig instead
 */
export async function applyAstGrepFilter(
  versions: FileVersions,
  args: string[],
  filePath?: string,
): Promise<FilterResult | null> {
  if (args.length === 0) {
    throw new Error('ast-grep filter requires at least a pattern argument')
  }

  const [pattern, language, selector] = args

  return astGrepFilter.apply(versions, {
    language: language as AstGrepLanguage | undefined,
    pattern,
    selector,
    type: 'ast-grep',
  }, filePath)
}
