import {minimatch} from 'minimatch'

import type {ReportOutput} from '../actions/index.js'
import type {Check, DistillConfig, FileCheckset} from '../configuration/config.js'
import type {File, FileVersions} from '../diff/parser.js'
import type {ProcessingContext} from './types.js'

import {executeReportAction, isReportAction} from '../actions/index.js'
import {applyFilter, type FilterResult} from '../filters/index.js'

export async function processFiles(
  files: File[],
  config: DistillConfig,
  context: ProcessingContext,
): Promise<ReportOutput[]> {
  const reports: ReportOutput[] = []

  for (const file of files) {
    for (const checkset of config.checksets) {
      // eslint-disable-next-line no-await-in-loop
      const rulesetReports = await processRuleset(checkset as FileCheckset, file, context)
      reports.push(...rulesetReports)
    }
  }

  return reports
}

async function processRuleset(ruleset: FileCheckset, file: File, context: ProcessingContext): Promise<ReportOutput[]> {
  const filePath = file.newPath || file.oldPath

  if (!minimatch(filePath, ruleset.include)) {
    return []
  }

  const versions = await getFileVersions(file, context)
  const reports: ReportOutput[] = []

  for (const rule of ruleset.checks) {
    // eslint-disable-next-line no-await-in-loop
    const ruleReports = await processRule(rule, versions, filePath)
    reports.push(...ruleReports)
  }

  return reports
}

async function processRule(rule: Check, versions: FileVersions, filePath: string): Promise<ReportOutput[]> {
  const reports: ReportOutput[] = []

  // Apply filters
  let filterResult: FilterResult | null = null
  for (const filter of rule.filters) {
    // eslint-disable-next-line no-await-in-loop
    filterResult = await applyFilter(filter, versions, filePath)
    if (!filterResult) {
      return reports
    }
  }

  // Execute actions if we have a filter result
  if (filterResult) {
    for (const action of rule.actions) {
      if (isReportAction(action)) {
        const report = executeReportAction(action, filterResult, {filePath})
        reports.push(report)
      }
    }
  }

  return reports
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
