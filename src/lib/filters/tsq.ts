import {extname} from 'node:path'

import type {FileVersions} from '../diff/parser.js'
import type {FilterApplier, FilterResult} from './types.js'

import {getLanguageForExtension, initTreeSitter, type SupportedExtension} from '../tree-sitter.js'
import {processFilter} from './utils.js'

export type TsqSupportedExtension = SupportedExtension

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

    const extractNodes = (content: null | string): {context: Record<string, string>[][]; text: string} => {
      if (!content) return {context: [], text: ''}

      try {
        const parser = new Parser()
        parser.setLanguage(language)

        const tree = parser.parse(content)
        if (!tree) return {context: [], text: ''}

        const query = new Query(language, queryString)
        const matches = query.matches(tree.rootNode)

        const nodeTexts: string[] = []
        const contexts: Record<string, string>[] = []
        const seen = new Set<number>()

        for (const match of matches) {
          const {captures} = match

          // 1. Determine which captures are "content" (to be extracted as text)
          // Rules:
          // A. If config.capture is set, only captures with that name are content.
          // B. If config.capture is NOT set, only "maximal" captures are content (filters out nested captures).
          const contentCaptures = capture
            ? captures.filter((c) => c.name === capture)
            : captures.filter(
                (c) =>
                  !captures.some(
                    (other) =>
                      other !== c &&
                      other.node.startIndex <= c.node.startIndex &&
                      other.node.endIndex >= c.node.endIndex &&
                      (other.node.startIndex < c.node.startIndex || other.node.endIndex > c.node.endIndex),
                  ),
              )

          // 2. Add content to nodeTexts
          for (const c of contentCaptures) {
            if (!seen.has(c.node.id)) {
              seen.add(c.node.id)
              nodeTexts.push(c.node.text)
            }
          }

          // 3. Context is everything else
          // We exclude the captured content itself from the context to avoid redundancy/noise
          const matchContext: Record<string, string> = {}
          let hasContext = false

          for (const c of captures) {
            // Check if this capture is one of the content captures
            const isContent = contentCaptures.includes(c)

            // Only add to context if it's NOT the primary content being diffed
            if (!isContent) {
              matchContext[c.name] = c.node.text
              hasContext = true
            }
          }

          if (hasContext) {
            contexts.push(matchContext)
          }
        }

        // Clean up
        query.delete()
        tree.delete()
        parser.delete()

        return {
          context: [contexts], // Wrap in array to match expected SymbolicContext[][] structure if needed, or adjust types
          text: nodeTexts.join('\n\n'),
        }
      } catch {
        // If parsing or query fails, return empty
        return {context: [], text: ''}
      }
    }

    return processFilter(versions, extractNodes)
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
