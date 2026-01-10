// =============================================================================
// DISTILL CONFIGURATION
// =============================================================================
// Core concepts:
// - Concern: An area of governance interest (security, api-contracts, etc.)
// - Signal: What to detect and how to respond (watch + report + notify)
// - Watch: File patterns + extraction type (jq, regex, tsq, ast-grep, xpath)
// - Report: Output format (type + template)
// - Notify: Channel → target dictionary
// =============================================================================

// =============================================================================
// WATCH CONFIGURATION
// A watch defines file patterns and how to extract relevant content.
// =============================================================================

/**
 * Base properties shared by all watch types.
 */
export interface WatchBase {
  /**
   * Glob pattern(s) for files to watch.
   * Can be a single pattern or an array of patterns.
   * Uses minimatch syntax for pattern matching.
   *
   * @example "package.json"
   * @example ["package.json", "yarn.lock"]
   * @example "src/**\/*.ts"
   */
  include: string | string[]
}

/**
 * Configuration for the jq watch type.
 * Uses the jq command-line tool to extract/transform JSON content.
 */
export interface JqWatch extends WatchBase {
  /**
   * The jq query expression to apply to JSON content.
   * See https://jqlang.github.io/jq/manual/ for syntax reference.
   */
  query: string
  type: 'jq'
}

/**
 * Configuration for the regex watch type.
 * Extracts content matching a regular expression pattern.
 */
export interface RegexWatch extends WatchBase {
  /**
   * Optional regex flags to modify matching behavior.
   * The 'g' (global) and 'm' (multiline) flags are always applied automatically.
   */
  flags?: string
  /**
   * The regular expression pattern to match.
   * Uses JavaScript regex syntax.
   */
  pattern: string
  type: 'regex'
}

/**
 * Configuration for the tsq (tree-sitter query) watch type.
 * Extracts AST nodes using tree-sitter's S-expression query syntax.
 */
export interface TsqWatch extends WatchBase {
  /**
   * Optional capture name to filter results.
   */
  capture?: string
  /**
   * Optional file extension to override language detection.
   */
  language?: string
  /**
   * The tree-sitter query pattern using S-expression syntax.
   */
  query: string
  type: 'tsq'
}

/**
 * Pattern object for ast-grep with context and selector.
 */
export interface AstGrepPatternObject {
  /**
   * Full code snippet providing context for parsing.
   */
  context: string
  /**
   * AST node type to select from the matched context.
   */
  selector: string
}

/**
 * Configuration for the ast-grep watch type.
 * Extracts AST nodes using ast-grep's pattern syntax.
 */
export interface AstGrepWatch extends WatchBase {
  /**
   * The language to parse the code as.
   */
  language: string
  /**
   * The pattern to match against. Can be a string or object with context/selector.
   */
  pattern: AstGrepPatternObject | string
  type: 'ast-grep'
}

/**
 * Configuration for the xpath watch type.
 * Extracts nodes from XML/HTML content using XPath expressions.
 */
export interface XPathWatch extends WatchBase {
  /**
   * The XPath expression to evaluate.
   */
  expression: string
  /**
   * Optional namespace prefix mappings.
   */
  namespaces?: Record<string, string>
  type: 'xpath'
}

/**
 * Union type of all supported watch configurations.
 */
export type WatchConfig = AstGrepWatch | JqWatch | RegexWatch | TsqWatch | XPathWatch

/**
 * All supported watch type names.
 */
export type WatchType = WatchConfig['type']

// =============================================================================
// REPORT CONFIGURATION
// A report defines how to format the output when a signal triggers.
// =============================================================================

/**
 * A handlebars report renders a template with the watch results.
 */
export interface HandlebarsReport {
  /**
   * Handlebars template for the report.
   * Receives watch result context including diffText, filePath, etc.
   */
  template: string
  /**
   * Report type discriminant.
   */
  type: 'handlebars'
}

// Future report types can be added here:
// export interface JsonReport { type: 'json'; schema?: string }
// export interface SarifReport { type: 'sarif' }

/**
 * Union type of all supported report configurations.
 * Currently only handlebars is supported.
 */
export type ReportConfig = HandlebarsReport

/**
 * All supported report type names.
 */
export type ReportType = ReportConfig['type']

// =============================================================================
// NOTIFY CONFIGURATION
// Notify defines who to tell and how when a signal triggers.
// =============================================================================

/**
 * Notification channel types and their target formats.
 */
export interface NotifyConfig {
  /**
   * Email address to notify.
   * @example "security@company.com"
   */
  email?: string
  /**
   * GitHub username or team to mention/request review.
   * @example "@security-team"
   */
  github?: string
  /**
   * Jira issue key to comment on.
   * @example "SEC-123"
   */
  jira?: string
  /**
   * Slack channel or user to notify.
   * @example "#security-alerts"
   */
  slack?: string
  /**
   * Webhook URL to POST to.
   * @example "https://hooks.example.com/notify"
   */
  webhook?: string
}

// =============================================================================
// SIGNAL CONFIGURATION
// A signal combines watch + report + notify into a complete detection unit.
// =============================================================================

/**
 * A signal defines what to detect (watch), how to format output (report),
 * and who to notify when triggered.
 */
export interface Signal {
  /**
   * Notification channels and targets.
   * Each key is a channel type, value is the target.
   */
  notify?: NotifyConfig
  /**
   * How to format the output when the signal triggers.
   */
  report: ReportConfig | ReportRef
  /**
   * What to watch for - file patterns and extraction configuration.
   */
  watch: WatchConfig | WatchRef
}

// =============================================================================
// REFERENCE SYSTEM
// Allows reusing defined watches, reports, and signals via references.
// =============================================================================

/**
 * A reference to a defined item in the `defined` block.
 * Format: "#defined/<type>/<name>" where type is watches, reports, or signals.
 */
export interface UseReference {
  use: string
}

/**
 * Either an inline watch or a reference to a defined watch.
 */
export type WatchRef = UseReference | WatchConfig

/**
 * Either an inline report or a reference to a defined report.
 */
export type ReportRef = ReportConfig | UseReference

/**
 * Either an inline signal or a reference to a defined signal.
 */
export type SignalRef = Signal | UseReference

// =============================================================================
// CONCERN CONFIGURATION
// A concern represents an area of governance interest.
// =============================================================================

/**
 * A concern is an area of governance interest (e.g., security, api-contracts).
 * It contains signals that define what to watch and how to respond.
 */
export interface Concern {
  /**
   * Signals attached to this concern.
   * Each signal defines what to watch and how to respond.
   */
  signals: SignalRef[]
}

// =============================================================================
// DEFINED BLOCK
// Reusable definitions that can be referenced throughout the configuration.
// =============================================================================

/**
 * Block of reusable definitions that can be referenced via UseReference.
 */
export interface DefinedBlock {
  /**
   * Reusable report configurations.
   * Reference with: { use: "#defined/reports/<name>" }
   */
  reports?: Record<string, ReportConfig>
  /**
   * Reusable signal configurations.
   * Reference with: { use: "#defined/signals/<name>" }
   */
  signals?: Record<string, Signal>
  /**
   * Reusable watch configurations.
   * Reference with: { use: "#defined/watches/<name>" }
   */
  watches?: Record<string, WatchConfig>
}

// =============================================================================
// ROOT CONFIGURATION
// =============================================================================

/**
 * Root configuration interface for distill.yml files.
 * Concerns contain signals that define how to process git diffs.
 */
export interface DistillConfig {
  /**
   * Dictionary of concerns defined in the project.
   * Keys are concern IDs (e.g., "security", "api-contracts").
   */
  concerns: Record<string, Concern>
  /**
   * Reusable definitions that can be referenced throughout the configuration.
   */
  defined?: DefinedBlock
}

// =============================================================================
// FILTER RESULT (kept for processing pipeline)
// =============================================================================

/**
 * Result of applying a watch to file versions.
 */
export interface FilterResult {
  /**
   * Symbolic context from the watch (e.g., class/function names).
   */
  context?: Array<{name: string; type: string}>
  /**
   * The unified diff text between old and new artifacts.
   */
  diffText: string
  /**
   * The artifact extracted from the old version.
   */
  left: {artifact: string}
  /**
   * Line range within the filtered artifact.
   */
  lineRange?: {end: number; start: number}
  /**
   * The artifact extracted from the new version.
   */
  right: {artifact: string}
}
