import {minimatch} from 'minimatch'

import type {DefinedBlock, DistillConfig, NotifyConfig, Signal} from '../configuration/config.js'
import type {File, FileVersions} from '../diff/parser.js'
import type {ReportOutput} from '../reports/index.js'
import type {ProcessingContext} from './types.js'

import {resolveReport, resolveSignal, resolveWatch} from '../configuration/resolver.js'
import {executeReport} from '../reports/index.js'
import {applyWatch} from '../watches/index.js'

/** Result of processing files through all concerns */
export interface ProcessingResult {
  /** All reports generated */
  reports: ReportOutput[]
}

/**
 * Process files through all concerns and their signals.
 */
export async function processFiles(
  files: File[],
  config: DistillConfig,
  context: ProcessingContext,
): Promise<ProcessingResult> {
  const reports: ReportOutput[] = []

  for (const file of files) {
    for (const [concernId, concern] of Object.entries(config.concerns)) {
      for (const signalRef of concern.signals) {
        // eslint-disable-next-line no-await-in-loop
        const signalReports = await processSignal({
          concernId,
          context,
          defined: config.defined,
          file,
          signalRef,
        })
        reports.push(...signalReports)
      }
    }
  }

  return {reports}
}

/** Options for processing a signal against a file */
interface ProcessSignalOptions {
  concernId: string
  context: ProcessingContext
  defined?: DefinedBlock
  file: File
  signalRef: Signal | {use: string}
}

/**
 * Process a single signal against a file.
 * Returns reports if the signal matches and produces output.
 */
async function processSignal(options: ProcessSignalOptions): Promise<ReportOutput[]> {
  const {context, defined, file, signalRef} = options
  const filePath = file.newPath || file.oldPath

  // Resolve the signal reference
  const signal = resolveSignal(signalRef, defined)

  // Resolve the watch reference
  const watch = resolveWatch(signal.watch, defined)

  // Check if file matches the watch's include pattern(s)
  if (!matchesInclude(filePath, watch.include)) {
    return []
  }

  // Get file versions for comparison
  const versions = await getFileVersions(file, context)

  // Apply the watch extraction
  const watchResult = await applyWatch(watch, versions, filePath)

  if (!watchResult) {
    return []
  }

  // Execute the report
  const report = resolveReport(signal.report, defined)
  const reportOutput = executeReport(report, watchResult, {filePath})

  // Attach notify config to report metadata for downstream processing
  if (signal.notify) {
    reportOutput.notify = signal.notify
  }

  return [reportOutput]
}

/**
 * Check if a file path matches an include pattern (string or array of strings).
 */
function matchesInclude(filePath: string, include: string | string[]): boolean {
  const patterns = Array.isArray(include) ? include : [include]
  return patterns.some((pattern) => minimatch(filePath, pattern))
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

// =============================================================================
// EXTENDED REPORT OUTPUT (with notify info)
// =============================================================================

declare module '../reports/index.js' {
  interface ReportOutput {
    notify?: NotifyConfig
  }
}
