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
export interface ReportAction {
  /**
   * Handlebars template for the comment to produce. Accepts markdown,
   * and receives a FilterResult as its evaluation context.
   */
  template: string
  /**
   * Discriminant for tagged union. Implied when 'template' is present.
   */
  type?: 'report'
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
export interface RunAction {
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
  /**
   * Discriminant for tagged union. Implied when 'command' is present.
   */
  type?: 'run'
}

/**
 * An action that updates the shared context of the concerns attached to the checkset.
 */
export interface UpdateConcernContextAction {
  /**
   * Key-value pairs to set in the concern context.
   * Values can be Handlebars templates which receive a FilterResult as evaluation context.
   */
  set: Record<string, string>
  /**
   * Discriminant for tagged union. Implied when 'set' is present.
   */
  type?: 'set'
}

/**
 * Union type of all supported actions.
 * Actions can be discriminated by:
 * - 'template' property -> ReportAction
 * - 'command' property -> RunAction
 * - 'set' property -> UpdateConcernContextAction
 */
export type Action = ReportAction | RunAction | UpdateConcernContextAction

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
   * List of concern IDs that this checkset is attached to.
   */
  concerns?: string[]
  /**
   * Glob pattern for files to which this checkset applies.
   * Uses minimatch syntax for pattern matching.
   */
  include: string
}

/**
 * A stakeholder interested in a set of concerns.
 */
export interface Stakeholder {
  /**
   * How to contact the stakeholder.
   * Examples: "github-comment-mention", "github-reviewer-request", "github-assign", "webhook".
   */
  contactMethod: string
  /**
   * A description of the stakeholder's role or interest.
   */
  description?: string
  /**
   * The name of the stakeholder (e.g. a team or person).
   */
  name: string
}

/**
 * A concern represents a specific area of interest or domain in the project.
 * Checksets can be attached to concerns to group related checks.
 */
export interface Concern {
  /**
   * List of stakeholders associated with this concern.
   */
  stakeholders: Stakeholder[]
}

/**
 * Root configuration interface for distill.yml files.
 * Defines all the checksets for processing git diffs.
 */
export interface DistillConfig {
  /**
   * List of file checksets that define how to process different types of files.
   */
  checksets: FileCheckset[]
  /**
   * Dictionary of concerns defined in the project.
   * Keys are concern IDs.
   */
  concerns?: Record<string, Concern>
}
