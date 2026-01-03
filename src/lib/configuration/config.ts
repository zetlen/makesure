type ReusableDefinition = {
  /**
   * Optional name of the definition, for reuse. Names must be unique.
   * To use a definition by name, provide its name instead of the inline
   * definition object.
   */
  name?: string;
}

type SupportedFileFilterName =
  | "json"
  | "yaml"
  | "program"
  | "auto";

interface FileFilter extends ReusableDefinition {
  /**
   * Type of filter to apply. "auto" will detect based on file extension.
   */
  type: SupportedFileFilterName;
  /**
   * Args to pass to the filter or filter program.
   */
  args: string[];
}

// Will be a union type soon!
type Filter = FileFilter

/**
 * A "report" action produces a text report about the change.
 * It can be routed many places, including to a github comment.
 */
interface ReportAction extends ReusableDefinition {
  /**
   * Urgency of report.
   */
  urgency: number;
  /**
   * Handlebars template for the comment to produce. Accepts markdown,
   * and receives a RuleResult as its evaluation context.
   */
  template: string;
}

/**
 * A "run" action runs an arbitrary command that receives details about the
 * change as environment variables.
 */
interface RunAction extends ReusableDefinition {
  /**
   * Path to the command. Can be a string or an array of strings which will be
   * evaluated as arguments to produce the command path.
   */
  command: string | string[];
  /**
   * If the command requires arguments, they can be evaluated here as Handlebars
   * templates which receive a RuleResult as evaluation context.
   */
  args: string[];
  /**
   * If the default environment variables don't suffice, you can define new ones
   * as Handlebars templates which receive a RuleResult as evaluation context.
   */
  env: Record<string,string>;
}

type Action = ReportAction | RunAction;

interface Rule extends ReusableDefinition {
  // Actions to run when the rule is triggered.
  // Will run once per file.
  actions: Action[];
  filters: Filter[];
}

interface FileRuleset {
  /**
   * Glob of file patterns to which this rule will apply.
   */
  pattern: string;
  /**
   * List of rules or rule references to apply to these files
   */
  rules: Rule[]
}

export interface MakesureConfig {
  rules: FileRuleset[];
}