import Handlebars from 'handlebars'

import type {FilterResult, HandlebarsReport, ReportConfig} from '../configuration/config.js'

// Re-export report types for convenience
export type {HandlebarsReport, ReportConfig} from '../configuration/config.js'

export interface ReportMetadata {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: Record<string, any>[]
  diffText: string
  fileName: string
  lineRange?: {end: number; start: number}
  message: string
}

export interface ReportOutput {
  content: string
  metadata?: ReportMetadata
}

/**
 * Execute a report by rendering the template with the watch result.
 * Diff text and artifacts are marked as safe strings to avoid HTML escaping.
 */
export function executeReport(
  report: ReportConfig,
  filterResult: FilterResult,
  context: {filePath: string},
): ReportOutput {
  // Currently only handlebars is supported
  // Future: switch on report.type for different report formats
  return executeHandlebarsReport(report, filterResult, context)
}

/**
 * Execute a handlebars report by rendering the template.
 */
function executeHandlebarsReport(
  report: HandlebarsReport,
  filterResult: FilterResult,
  context: {filePath: string},
): ReportOutput {
  const template = Handlebars.compile(report.template)
  // Mark diff text and artifacts as safe to prevent HTML escaping
  const content = template({
    diffText: new Handlebars.SafeString(filterResult.diffText),
    filePath: context.filePath,
    left: {artifact: new Handlebars.SafeString(filterResult.left.artifact)},
    right: {artifact: new Handlebars.SafeString(filterResult.right.artifact)},
  })

  // Basic metadata population.
  const metadata: ReportMetadata = {
    diffText: filterResult.diffText,
    fileName: context.filePath,
    message: content, // Use the rendered content as the default message
    ...(filterResult.lineRange ? {lineRange: filterResult.lineRange} : {}),
    ...(filterResult.context ? {context: filterResult.context} : {}),
  }

  return {
    content,
    metadata,
  }
}
