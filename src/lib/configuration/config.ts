type ReusableDefinition = {
  /**
   * Optional name of the definition, for reuse. Names must be unique.
   * To use a definition by name, provide its name instead of the inline
   * definition object.
   */
  name?: string;
}

type SupportedFileFilterName =
  | "auto"
  | "jq"
  | "program"
  | "yq";

/**
 * A FileFilter will be run on each side of a file diff to produce artifacts for
 * A and B. A and B can then be diffed. If there is still a diff, the FileFilter
 * returns the diff as part of a FilterResult.
 */
interface FileFilter extends ReusableDefinition {
  /**
   * Args to pass to the filter or filter program.
   */
  args: string[];
  /**
   * Type of filter to apply. "auto" will detect based on file extension.
   */
  type: SupportedFileFilterName;
}

// Will be a union type soon!
type Filter = FileFilter

export interface FilterResult {
  diffText: string;
  left: {
    artifact: string;
  };
  right: {
    artifact: string;
  }
}

/**
 * A "report" action produces a text report about the change.
 * It can be routed many places, including to stdout or an API call
 * (for example, a GitHub comment).
 */
interface ReportAction extends ReusableDefinition {
  /**
   * Handlebars template for the comment to produce. Accepts markdown,
   * and receives a FilterResult as its evaluation context.
   */
  template: string;
  /**
   * Urgency of report.
   */
  urgency: number;
}

/**
 * A "run" action runs an arbitrary command that receives details about the
 * change as environment variables.
 */
interface RunAction extends ReusableDefinition {
  /**
   * If the command requires arguments, they can be evaluated here as Handlebars
   * templates which receive a FilterResult as evaluation context.
   */
  args: string[];
  /**
   * Path to the command. Can be a string or an array of strings which will be
   * evaluated as arguments to produce the command path.
   */
  command: string | string[];
  /**
   * If the default environment variables don't suffice, you can define new ones
   * as Handlebars templates which receive a FilterResult as evaluation context.
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