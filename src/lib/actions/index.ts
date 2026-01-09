import Handlebars from 'handlebars'

import type {Action, ReportAction, RunAction, UpdateConcernContextAction} from '../configuration/config.js'
import type {FilterResult} from '../filters/index.js'

// Re-export action types for convenience
export type {Action, ReportAction, RunAction, UpdateConcernContextAction} from '../configuration/config.js'

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
    urgency: action.urgency,
  }
}

/**
 * Execute an update concern context action.
 * Returns the updates to be applied to the concern context.
 */
export function executeUpdateConcernContextAction(
  action: UpdateConcernContextAction,
  filterResult: FilterResult,
  context: {filePath: string},
): Record<string, string> {
  const updates: Record<string, string> = {}
  for (const [key, valueTemplate] of Object.entries(action.set)) {
    const template = Handlebars.compile(valueTemplate)
    updates[key] = template({
      diffText: new Handlebars.SafeString(filterResult.diffText),
      filePath: context.filePath,
      left: {artifact: new Handlebars.SafeString(filterResult.left.artifact)},
      right: {artifact: new Handlebars.SafeString(filterResult.right.artifact)},
    })
  }

  return updates
}

/**
 * Type guard for report actions. Checks for the 'template' property which is unique to ReportAction.
 */
export function isReportAction(action: Action): action is ReportAction {
  return 'template' in action
}

/**
 * Type guard for run actions. Checks for the 'command' property which is unique to RunAction.
 */
export function isRunAction(action: Action): action is RunAction {
  return 'command' in action
}

/**
 * Type guard for update concern context actions. Checks for the 'set' property.
 */
export function isUpdateConcernContextAction(action: Action): action is UpdateConcernContextAction {
  return 'set' in action
}
