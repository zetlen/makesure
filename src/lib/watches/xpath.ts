import {DOMParser, XMLSerializer} from '@xmldom/xmldom'
import xpath from 'xpath'

import type {FileVersions} from '../diff/parser.js'
import type {FilterApplier, FilterResult} from './types.js'

import {createFilterResult} from './utils.js'

/**
 * Configuration for the xpath filter.
 * Extracts nodes from XML/HTML content using XPath expressions.
 *
 * @example
 * ```yaml
 * filters:
 *   - type: xpath
 *     expression: "//dependency/version"
 * ```
 *
 * @example
 * ```yaml
 * filters:
 *   - type: xpath
 *     expression: "//m:dependency[m:groupId='com.example']/m:version"
 *     namespaces:
 *       m: "http://maven.apache.org/POM/4.0.0"
 * ```
 */
export interface XPathFilterConfig {
  /**
   * The XPath expression to evaluate against the XML/HTML content.
   * See https://www.w3.org/TR/xpath/ for syntax reference.
   *
   * @example "//version"
   * @example "//dependency[groupId='com.example']/version"
   * @example "string(//project/version)"
   */
  expression: string

  /**
   * Optional namespace prefix mappings for XPath expressions.
   * Maps prefix strings to namespace URI strings.
   * Required when querying XML documents with namespaces.
   *
   * @example { "m": "http://maven.apache.org/POM/4.0.0" }
   * @example { "xhtml": "http://www.w3.org/1999/xhtml", "svg": "http://www.w3.org/2000/svg" }
   */
  namespaces?: Record<string, string>

  /**
   * Discriminant tag identifying this as an xpath filter.
   */
  type: 'xpath'
}

/**
 * XPath filter for extracting nodes from XML/HTML content.
 */
export const xpathFilter: FilterApplier<XPathFilterConfig> = {
  async apply(versions: FileVersions, config: XPathFilterConfig): Promise<FilterResult | null> {
    const {expression, namespaces} = config

    const extractNodes = (content: null | string): string => {
      if (!content) return ''

      try {
        const doc = new DOMParser().parseFromString(content, 'text/xml')
        const select = namespaces ? xpath.useNamespaces(namespaces) : xpath.select
        const nodes = select(expression, doc)

        if (!nodes || (Array.isArray(nodes) && nodes.length === 0)) {
          return ''
        }

        // Handle different result types
        if (typeof nodes === 'string' || typeof nodes === 'number' || typeof nodes === 'boolean') {
          return String(nodes)
        }

        const serializer = new XMLSerializer()
        return (nodes as {nodeType?: number}[])
          .map((node) => {
            if ('nodeType' in node) {
              // Element or text node
              return serializer.serializeToString(node as unknown as globalThis.Node)
            }

            return String(node)
          })
          .join('\n')
      } catch {
        // If parsing fails, return empty
        return ''
      }
    }

    // If both are null, nothing to filter
    if (versions.oldContent === null && versions.newContent === null) {
      return null
    }

    const leftArtifact = extractNodes(versions.oldContent)
    const rightArtifact = extractNodes(versions.newContent)

    return createFilterResult(leftArtifact, rightArtifact)
  },
}
