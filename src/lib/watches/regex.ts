import type {FileVersions} from '../diff/parser.js'
import type {FilterApplier, FilterResult} from './types.js'

import {processFilter} from './utils.js'

/**
 * Configuration for the regex filter.
 * Extracts content matching a regular expression pattern.
 *
 * @example
 * ```yaml
 * filters:
 *   - type: regex
 *     pattern: "API_KEY=.*"
 * ```
 *
 * @example
 * ```yaml
 * filters:
 *   - type: regex
 *     pattern: "version\\s*=\\s*[\"']([^\"']+)[\"']"
 *     flags: "i"
 * ```
 */
export interface RegexFilterConfig {
  /**
   * Optional regex flags to modify matching behavior.
   * The 'g' (global) and 'm' (multiline) flags are always applied automatically.
   *
   * Common flags:
   * - 'i': Case-insensitive matching
   * - 's': Dot matches newlines (dotAll mode)
   * - 'u': Unicode mode
   *
   * @example "i"
   * @example "iu"
   */
  flags?: string

  /**
   * The regular expression pattern to match.
   * Uses JavaScript regex syntax.
   *
   * @example "API_KEY=.*"
   * @example "version\\s*=\\s*\\d+\\.\\d+\\.\\d+"
   * @example "import\\s+\\{[^}]+\\}\\s+from"
   */
  pattern: string

  /**
   * Discriminant tag identifying this as a regex filter.
   */
  type: 'regex'
}

/**
 * Regex filter for extracting content matching a regular expression pattern.
 */
export const regexFilter: FilterApplier<RegexFilterConfig> = {
  async apply(versions: FileVersions, config: RegexFilterConfig): Promise<FilterResult | null> {
    const {flags = '', pattern} = config

    // Always include 'g' flag for global matching, and 'm' for multiline
    const effectiveFlags = flags.includes('g') ? flags : `${flags}gm`
    const regex = new RegExp(pattern, effectiveFlags)

    const extractMatches = (content: null | string): {context: Record<string, string>[][]; text: string} => {
      if (!content) return {context: [], text: ''}

      const matches = [...content.matchAll(regex)]
      if (matches.length === 0) return {context: [], text: ''}

      const text = matches.map((m) => m[0]).join('\n')

      // Extract groups from each match
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contexts: Record<string, any>[] = []

      for (const match of matches) {
        if (match.groups) {
          contexts.push({...match.groups})
        }
      }

      return {
        context: [contexts],
        text,
      }
    }

    return processFilter(versions, extractMatches)
  },
}
