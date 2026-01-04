import type {FileVersions} from '../diff/parser.js'
import type {Filter, FilterResult} from './types.js'

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
export {applyAstGrepFilter} from './ast-grep.js'
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
export type {BaseFilterConfig, Filter, FilterApplier, FilterResult} from './types.js'
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
  filter: Filter | FilterConfig,
  versions: FileVersions,
  filePath?: string,
): Promise<FilterResult | null> {
  // Handle legacy Filter format (with args array)
  if ('args' in filter && Array.isArray(filter.args)) {
    switch (filter.type) {
      case 'ast-grep': {
        return astGrepFilter.apply(versions, {
          language: filter.args[1] as AstGrepFilterConfig['language'],
          pattern: filter.args[0],
          selector: filter.args[2],
          type: 'ast-grep',
        }, filePath)
      }

      case 'jq': {
        return jqFilter.apply(versions, {query: filter.args[0], type: 'jq'})
      }

      case 'regex': {
        return regexFilter.apply(versions, {
          flags: filter.args[1],
          pattern: filter.args[0],
          type: 'regex',
        })
      }

      case 'tsq': {
        return tsqFilter.apply(versions, {
          capture: filter.args[1],
          language: filter.args[2] as TsqFilterConfig['language'],
          query: filter.args[0],
          type: 'tsq',
        }, filePath)
      }

      case 'xpath': {
        const namespaces = filter.args[1] ? JSON.parse(filter.args[1]) as Record<string, string> : undefined
        return xpathFilter.apply(versions, {
          expression: filter.args[0],
          namespaces,
          type: 'xpath',
        })
      }

      default: {
        throw new Error(`Unsupported filter type: ${filter.type}`)
      }
    }
  }

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
