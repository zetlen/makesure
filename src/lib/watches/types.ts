import type {FileVersions} from '../diff/parser.js'

/**
 * Result of applying a filter to file versions.
 * Contains the diff text and the artifacts from both sides.
 */
export interface FilterResult {
  context?: Array<{name: string; type: string}>
  diffText: string
  left: {
    artifact: string
  }
  lineRange?: {
    end: number
    start: number
  }
  right: {
    artifact: string
  }
}

/**
 * Interface that filter implementations must satisfy.
 * Each filter takes file versions and its specific config, returning a FilterResult.
 */
export interface FilterApplier<TConfig> {
  /**
   * Apply the filter to file versions.
   * @param versions - The old and new content of a file
   * @param config - Filter-specific configuration
   * @param filePath - Optional file path for language detection (used by tsq)
   * @returns FilterResult if there's a meaningful diff, null otherwise
   */
  apply(versions: FileVersions, config: TConfig, filePath?: string): Promise<FilterResult | null>
}
