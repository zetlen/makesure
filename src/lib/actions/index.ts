import Handlebars from 'handlebars'

import type {FilterResult} from '../filters/index.js'

export interface ReportAction {
  template: string
  urgency: number
}

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

export interface UpdateConcernContextAction {
  set: Record<string, string>
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

/**
 * Check if an action is an update concern context action.
 */
export function isUpdateConcernContextAction(action: unknown): action is UpdateConcernContextAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    'set' in action &&
    typeof (action as UpdateConcernContextAction).set === 'object'
  )
}
