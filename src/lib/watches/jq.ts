import type {FileVersions} from '../diff/parser.js'
import type {FilterApplier, FilterResult} from './types.js'

import {createFilterResult, runWithStdin} from './utils.js'

/**
 * Configuration for the jq filter.
 * Uses the jq command-line tool to extract/transform JSON content.
 *
 * @example
 * ```yaml
 * filters:
 *   - type: jq
 *     query: ".version"
 * ```
 *
 * @example
 * ```yaml
 * filters:
 *   - type: jq
 *     query: ".dependencies | keys"
 * ```
 */
export interface JqFilterConfig {
  /**
   * The jq query expression to apply to JSON content.
   * See https://jqlang.github.io/jq/manual/ for syntax reference.
   *
   * @example ".version"
   * @example ".dependencies | keys"
   * @example ".scripts | to_entries | map(select(.key | startswith(\"test\")))"
   */
  query: string

  /**
   * Discriminant tag identifying this as a jq filter.
   */
  type: 'jq'
}

/**
 * Run jq with the given query on the input content.
 */
async function runJq(content: string, query: string): Promise<string> {
  return runWithStdin('jq', [query], content)
}

/**
 * JQ filter for processing JSON content.
 * Uses the jq command-line tool to extract/transform JSON.
 */
export const jqFilter: FilterApplier<JqFilterConfig> = {
  async apply(versions: FileVersions, config: JqFilterConfig): Promise<FilterResult | null> {
    // If both are null, nothing to filter
    if (versions.oldContent === null && versions.newContent === null) {
      return null
    }

    const leftArtifact = versions.oldContent ? await runJq(versions.oldContent, config.query) : ''
    const rightArtifact = versions.newContent ? await runJq(versions.newContent, config.query) : ''

    return createFilterResult(leftArtifact, rightArtifact, false)
  },
}
