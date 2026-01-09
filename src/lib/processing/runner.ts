import {minimatch} from 'minimatch'

import type {ReportOutput} from '../actions/index.js'
import type {Action, Check, DistillConfig, FileCheckset, UpdateConcernContextAction} from '../configuration/config.js'
import type {File, FileVersions} from '../diff/parser.js'
import type {ConcernContext, ProcessingContext} from './types.js'

import {
  executeReportAction,
  executeUpdateConcernContextAction,
  isReportAction,
  isUpdateConcernContextAction,
} from '../actions/index.js'
import {applyFilter, type FilterResult} from '../filters/index.js'

/** Result of processing files through all checksets */
export interface ProcessingResult {
  concerns: ConcernContext
  reports: ReportOutput[]
}

export async function processFiles(
  files: File[],
  config: DistillConfig,
  context: ProcessingContext,
): Promise<ProcessingResult> {
  const reports: ReportOutput[] = []

  for (const file of files) {
    for (const checkset of config.checksets) {
      // eslint-disable-next-line no-await-in-loop
      const rulesetReports = await processCheckset({checkset, context, file})
      reports.push(...rulesetReports)
    }
  }

  return {concerns: context.concerns, reports}
}

/** Options for processing a checkset against a file */
interface ProcessChecksetOptions {
  checkset: FileCheckset
  context: ProcessingContext
  file: File
}

async function processCheckset(options: ProcessChecksetOptions): Promise<ReportOutput[]> {
  const {checkset, context, file} = options
  const filePath = file.newPath || file.oldPath

  if (!minimatch(filePath, checkset.include)) {
    return []
  }

  const versions = await getFileVersions(file, context)
  const reports: ReportOutput[] = []

  for (const check of checkset.checks) {
    // eslint-disable-next-line no-await-in-loop
    const checkReports = await processCheck({
      check,
      concernIds: checkset.concerns,
      context,
      filePath,
      versions,
    })
    reports.push(...checkReports)
  }

  return reports
}

/** Options for processing a single check */
interface ProcessCheckOptions {
  check: Check
  concernIds?: string[]
  context: ProcessingContext
  filePath: string
  versions: FileVersions
}

async function processCheck(options: ProcessCheckOptions): Promise<ReportOutput[]> {
  const {check, concernIds, context, filePath, versions} = options
  const reports: ReportOutput[] = []

  // Apply filters - all must pass
  let filterResult: FilterResult | null = null
  for (const filter of check.filters) {
    // eslint-disable-next-line no-await-in-loop
    filterResult = await applyFilter(filter, versions, filePath)
    if (!filterResult) {
      return reports
    }
  }

  // Execute actions if we have a filter result
  if (filterResult) {
    processActions({
      actions: check.actions,
      concernIds,
      context,
      filePath,
      filterResult,
      reports,
    })
  }

  return reports
}

/** Options for processing actions from a triggered check */
interface ProcessActionsOptions {
  actions: Action[]
  concernIds?: string[]
  context: ProcessingContext
  filePath: string
  filterResult: FilterResult
  reports: ReportOutput[]
}

function processActions(options: ProcessActionsOptions): void {
  const {actions, concernIds, context, filePath, filterResult, reports} = options

  for (const action of actions) {
    if (isReportAction(action)) {
      const report = executeReportAction(action, filterResult, {filePath})
      reports.push(report)
    } else if (isUpdateConcernContextAction(action)) {
      applyConcernContextUpdates({action, concernIds, context, filePath, filterResult})
    }
  }
}

/** Options for applying concern context updates */
interface ApplyConcernContextUpdatesOptions {
  action: UpdateConcernContextAction
  concernIds?: string[]
  context: ProcessingContext
  filePath: string
  filterResult: FilterResult
}

function applyConcernContextUpdates(options: ApplyConcernContextUpdatesOptions): void {
  const {action, concernIds, context, filePath, filterResult} = options

  if (!concernIds) {
    return
  }

  const updates = executeUpdateConcernContextAction(action, filterResult, {filePath})

  for (const concernId of concernIds) {
    if (!context.concerns[concernId]) {
      context.concerns[concernId] = {}
    }

    context.concerns[concernId] = {...context.concerns[concernId], ...updates}
  }
}

/**
 * Get the old and new content of a file using the content provider.
 */
async function getFileVersions(file: File, context: ProcessingContext): Promise<FileVersions> {
  let oldContent: null | string = null
  let newContent: null | string = null

  // Get old content if file existed before (not an add)
  if (file.type !== 'add') {
    oldContent = await context.contentProvider(context.refs.base, file.oldPath)
  }

  // Get new content if file exists after (not a delete)
  if (file.type !== 'delete') {
    newContent = await context.contentProvider(context.refs.head, file.newPath)
  }

  return {newContent, oldContent}
}
