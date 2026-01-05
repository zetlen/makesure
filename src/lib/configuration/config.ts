import type {AstGrepFilterConfig} from '../filters/ast-grep.js'
import type {JqFilterConfig} from '../filters/jq.js'
import type {RegexFilterConfig} from '../filters/regex.js'
import type {TsqFilterConfig} from '../filters/tsq.js'
import type {XPathFilterConfig} from '../filters/xpath.js'

// Re-export filter config types for convenience
export type {AstGrepFilterConfig} from '../filters/ast-grep.js'
export type {JqFilterConfig} from '../filters/jq.js'
export type {RegexFilterConfig} from '../filters/regex.js'
export type {TsqFilterConfig} from '../filters/tsq.js'
/**
 * Re-export FilterResult from filters module for backwards compatibility.
 */
export type {FilterResult} from '../filters/types.js'

/**
 * Union type of all supported filter configurations.
 * Each filter type has its own specific properties with the 'type' field as discriminant.
 *
 * @example AstGrepFilterConfig - For ast-grep pattern matching
 * @example JqFilterConfig - For JSON processing with jq
 * @example RegexFilterConfig - For regex pattern matching
 * @example XPathFilterConfig - For XML/HTML XPath queries
 * @example TsqFilterConfig - For tree-sitter AST queries
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

export type {XPathFilterConfig} from '../filters/xpath.js'

/**
 * A "report" action produces a text report about the change.
 * It can be routed many places, including to stdout or an API call
 * (for example, a GitHub comment).
 */
interface ReportAction {
  /**
   * Handlebars template for the comment to produce. Accepts markdown,
   * and receives a FilterResult as its evaluation context.
   */
  template: string
  /**
   * Urgency of report. Higher values indicate more important/urgent reports.
   * Reports are sorted by urgency (highest first) when output.
   */
  urgency: number
}

/**
 * A "run" action runs an arbitrary command that receives details about the
 * change as environment variables.
 */
interface RunAction {
  /**
   * If the command requires arguments, they can be evaluated here as Handlebars
   * templates which receive a FilterResult as evaluation context.
   */
  args: string[]
  /**
   * Path to the command. Can be a string or an array of strings which will be
   * evaluated as arguments to produce the command path.
   */
  command: string | string[]
  /**
   * If the default environment variables don't suffice, you can define new ones
   * as Handlebars templates which receive a FilterResult as evaluation context.
   */
  env: Record<string, string>
}

/**
 * Union type of all supported actions.
 */
type Action = ReportAction | RunAction

/**
 * A check defines filters to apply and actions to take when changes match.
 */
export interface Check {
  /**
   * Actions to run when the check is triggered.
   * Will run once per file that matches the check's filters.
   */
  actions: Action[]
  /**
   * Filters to apply to the file content.
   * Each filter processes the file and produces artifacts for comparison.
   * If all filters produce a meaningful diff, the actions are triggered.
   */
  filters: FilterConfig[]
}

/**
 * Files matching the glob pattern will have the checks applied to them.
 */
export interface FileCheckset {
  /**
   * List of checks to apply to files matching the pattern.
   */
  checks: Check[]
  /**
   * Glob pattern for files to which this checkset applies.
   * Uses minimatch syntax for pattern matching.
   */
  include: string
}

/**
 * Root configuration interface for makesure.yml files.
 * Defines all the checksets for processing git diffs.
 */
export interface MakesureConfig {
  /**
   * List of file checksets that define how to process different types of files.
   */
  checksets: FileCheckset[]
}
