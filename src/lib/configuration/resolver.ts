import type {DefinedBlock, ReportConfig, ReportRef, Signal, SignalRef, WatchConfig, WatchRef} from './config.js'

/**
 * Type guard to check if an object is a UseReference.
 */
export function isUseReference(obj: unknown): obj is {use: string} {
  return typeof obj === 'object' && obj !== null && 'use' in obj && typeof (obj as {use: unknown}).use === 'string'
}

/**
 * Parsed reference information from a use string.
 */
export interface ParsedReference {
  name: string
  type: 'reports' | 'signals' | 'watches'
}

/**
 * Parse a use reference string into its components.
 * Expected format: "#defined/<type>/<name>"
 *
 * @throws Error if the reference format is invalid
 */
export function parseUseReference(use: string): ParsedReference {
  const match = use.match(/^#defined\/(signals|watches|reports)\/(.+)$/)
  if (!match) {
    throw new Error(
      `Invalid reference format: "${use}". Expected "#defined/<type>/<name>" where type is signals, watches, or reports.`,
    )
  }

  return {
    name: match[2],
    type: match[1] as ParsedReference['type'],
  }
}

/**
 * Resolve a signal reference to an actual Signal.
 *
 * @throws Error if the reference cannot be resolved
 */
export function resolveSignal(ref: SignalRef, defined?: DefinedBlock): Signal {
  if (!isUseReference(ref)) {
    return ref
  }

  const parsed = parseUseReference(ref.use)
  if (parsed.type !== 'signals') {
    throw new Error(`Expected a signal reference, got "${parsed.type}" in "${ref.use}"`)
  }

  const signal = defined?.signals?.[parsed.name]
  if (!signal) {
    throw new Error(`Signal "${parsed.name}" not found in defined.signals`)
  }

  return signal
}

/**
 * Resolve a watch reference to an actual WatchConfig.
 *
 * @throws Error if the reference cannot be resolved
 */
export function resolveWatch(ref: WatchRef, defined?: DefinedBlock): WatchConfig {
  if (!isUseReference(ref)) {
    return ref
  }

  const parsed = parseUseReference(ref.use)
  if (parsed.type !== 'watches') {
    throw new Error(`Expected a watch reference, got "${parsed.type}" in "${ref.use}"`)
  }

  const watch = defined?.watches?.[parsed.name]
  if (!watch) {
    throw new Error(`Watch "${parsed.name}" not found in defined.watches`)
  }

  return watch
}

/**
 * Resolve a report reference to an actual ReportConfig.
 *
 * @throws Error if the reference cannot be resolved
 */
export function resolveReport(ref: ReportRef, defined?: DefinedBlock): ReportConfig {
  if (!isUseReference(ref)) {
    return ref
  }

  const parsed = parseUseReference(ref.use)
  if (parsed.type !== 'reports') {
    throw new Error(`Expected a report reference, got "${parsed.type}" in "${ref.use}"`)
  }

  const report = defined?.reports?.[parsed.name]
  if (!report) {
    throw new Error(`Report "${parsed.name}" not found in defined.reports`)
  }

  return report
}
