import type {FileVersions} from '../diff/parser.js'
import type {FilterResult} from './types.js'

import {astGrepFilter, type AstGrepFilterConfig} from './ast-grep.js'
import {jqFilter, type JqFilterConfig} from './jq.js'
import {regexFilter, type RegexFilterConfig} from './regex.js'
import {tsqFilter, type TsqFilterConfig} from './tsq.js'
import {xpathFilter, type XPathFilterConfig} from './xpath.js'

// Re-export types from individual watch implementations
export type {AstGrepFilterConfig, AstGrepPatternObject} from './ast-grep.js'
export {astGrepFilter} from './ast-grep.js'
export type {JqFilterConfig} from './jq.js'
export {jqFilter} from './jq.js'
export type {RegexFilterConfig} from './regex.js'
export {regexFilter} from './regex.js'
export type {TsqFilterConfig} from './tsq.js'
export {tsqFilter} from './tsq.js'
export type {FilterApplier, FilterResult} from './types.js'
export type {XPathFilterConfig} from './xpath.js'
export {xpathFilter} from './xpath.js'

/**
 * Union type of all supported watch configurations (extraction part only, without include).
 * Each watch type has its own specific properties with the 'type' field as discriminant.
 */
export type WatchExtractionConfig =
  | AstGrepFilterConfig
  | JqFilterConfig
  | RegexFilterConfig
  | TsqFilterConfig
  | XPathFilterConfig

/**
 * All supported watch type names.
 */
export type WatchType = WatchExtractionConfig['type']

/**
 * Apply a watch to file versions based on watch configuration.
 * Uses the discriminated union to route to the correct watch implementation.
 *
 * Note: This function handles the extraction logic only.
 * The include pattern matching is done by the processing runner.
 */
export async function applyWatch(
  watch: WatchExtractionConfig,
  versions: FileVersions,
  filePath?: string,
): Promise<FilterResult | null> {
  switch (watch.type) {
    case 'ast-grep': {
      return astGrepFilter.apply(versions, watch, filePath)
    }

    case 'jq': {
      return jqFilter.apply(versions, watch)
    }

    case 'regex': {
      return regexFilter.apply(versions, watch)
    }

    case 'tsq': {
      return tsqFilter.apply(versions, watch, filePath)
    }

    case 'xpath': {
      return xpathFilter.apply(versions, watch)
    }

    default: {
      // TypeScript exhaustiveness check
      const exhaustiveCheck: never = watch
      throw new Error(`Unsupported watch type: ${(exhaustiveCheck as WatchExtractionConfig).type}`)
    }
  }
}
