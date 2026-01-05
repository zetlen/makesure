import type {FileVersions} from '../diff/parser.js'
import type {FilterApplier, FilterResult} from './types.js'

import {createDiffText} from './utils.js'

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
  },
}

/**
 * Apply a regex filter to extract matching lines from content.
 * @deprecated Use regexFilter.apply() with RegexFilterConfig instead
 */
export async function applyRegexFilter(versions: FileVersions, args: string[]): Promise<FilterResult | null> {
  if (args.length === 0) {
    throw new Error('Regex filter requires at least a pattern argument')
  }

  return regexFilter.apply(versions, {
    flags: args[1],
    pattern: args[0],
    type: 'regex',
  })
}
