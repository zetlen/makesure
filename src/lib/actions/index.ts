import Handlebars from 'handlebars'

import type {FilterResult} from '../filters/index.js'

export interface ReportAction {
  template: string
  urgency: number
}

export interface ReportMetadata {
  diffText: string
  fileName: string
  lineRange?: {end: number; start: number;}
  message: string
}

export interface ReportOutput {
  content: string
  metadata?: ReportMetadata
  urgency: number
}

/**
 * Execute a report action by rendering the template with the filter result.
 * Diff text and artifacts are marked as safe strings to avoid HTML escaping.
 */
export function executeReportAction(
  action: ReportAction,
  filterResult: FilterResult,
  context: {filePath: string},
): ReportOutput {
  const template = Handlebars.compile(action.template)
  // Mark diff text and artifacts as safe to prevent HTML escaping
  const content = template({
    diffText: new Handlebars.SafeString(filterResult.diffText),
    filePath: context.filePath,
    left: {artifact: new Handlebars.SafeString(filterResult.left.artifact)},
    right: {artifact: new Handlebars.SafeString(filterResult.right.artifact)},
  })

  // Basic metadata population.
  const lineRange = parseLineRange(filterResult.diffText)
  const metadata: ReportMetadata = {
    diffText: filterResult.diffText,
    fileName: context.filePath,
    message: content, // Use the rendered content as the default message
    ...(lineRange ? {lineRange} : {}),
  }

  return {
    content,
    metadata,
    urgency: action.urgency,
  }
}

/**
 * Extract the line range from the first hunk header in the diff text.
 * Hunk headers format: @@ -oldStart,oldLines +newStart,newLines @@
 * We are interested in the new range (after the +).
 */
function parseLineRange(diffText: string): undefined | {end: number; start: number;} {
  const match = diffText.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/m)
  if (!match) {
    return undefined
  }

  const start = Number.parseInt(match[1], 10)
  const lines = match[2] ? Number.parseInt(match[2], 10) : 1

  return {
    end: start + lines - 1, // inclusive
    start,
  }
}

/**
 * Check if an action is a report action.
 */
export function isReportAction(action: unknown): action is ReportAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    'template' in action &&
    typeof (action as ReportAction).template === 'string'
  )
}
