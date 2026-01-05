import type {FileVersions} from '../diff/parser.js'
import type {FilterResult} from './types.js'

import {astGrepFilter, type AstGrepFilterConfig} from './ast-grep.js'
import {jqFilter, type JqFilterConfig} from './jq.js'
import {regexFilter, type RegexFilterConfig} from './regex.js'
import {tsqFilter, type TsqFilterConfig} from './tsq.js'
import {xpathFilter, type XPathFilterConfig} from './xpath.js'

// Re-export individual filter config types
export type {AstGrepFilterConfig} from './ast-grep.js'
// Re-export individual filters for direct access
export {astGrepFilter} from './ast-grep.js'
// Re-export legacy function names for backwards compatibility
export type {JqFilterConfig} from './jq.js'
export {jqFilter} from './jq.js'
export {applyJqFilter} from './jq.js'
export type {RegexFilterConfig} from './regex.js'

export {regexFilter} from './regex.js'
export {applyRegexFilter} from './regex.js'
export type {TsqFilterConfig} from './tsq.js'
export {tsqFilter} from './tsq.js'

export {applyTsqFilter} from './tsq.js'
// Re-export types
export type {FilterApplier, FilterResult} from './types.js'
export type {XPathFilterConfig} from './xpath.js'
export {xpathFilter} from './xpath.js'

export {applyXpathFilter} from './xpath.js'

/**
 * Union type of all supported filter configurations.
 * Each filter type has its own specific properties with the 'type' field as discriminant.
 */
export type FilterConfig =
  | AstGrepFilterConfig
  | JqFilterConfig
  | RegexFilterConfig
  | TsqFilterConfig
  | XPathFilterConfig

/**
 * All supported filter type names.
 */
export type FilterType = FilterConfig['type']

/**
 * Apply a filter to file versions based on filter configuration.
 * Uses the discriminated union to route to the correct filter implementation.
 */
export async function applyFilter(
  filter: FilterConfig,
  versions: FileVersions,
  filePath?: string,
): Promise<FilterResult | null> {
  // Handle legacy Filter format (with args array)

  // Handle new FilterConfig format (discriminated union)
  const config = filter as FilterConfig
  switch (config.type) {
    case 'ast-grep': {
      return astGrepFilter.apply(versions, config, filePath)
    }

    case 'jq': {
      return jqFilter.apply(versions, config)
    }

    case 'regex': {
      return regexFilter.apply(versions, config)
    }

    case 'tsq': {
      return tsqFilter.apply(versions, config, filePath)
    }

    case 'xpath': {
      return xpathFilter.apply(versions, config)
    }

    default: {
      // TypeScript exhaustiveness check
      const exhaustiveCheck: never = config
      throw new Error(`Unsupported filter type: ${(exhaustiveCheck as FilterConfig).type}`)
    }
  }
}
