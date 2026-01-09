import {Command, Flags, Interfaces} from '@oclif/core'

import type {ReportMetadata, ReportOutput} from '../lib/actions/index.js'
import type {ConcernContext} from '../lib/processing/types.js'

// Type helpers for inherited flags and args
export type InferredFlags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)['baseFlags'] & T['flags']
>
export type InferredArgs<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

/** JSON output structure for all commands */
export interface JsonOutput {
  concerns: ConcernContext
  reports: ReportMetadata[]
}

/**
 * Base command for distill CLI.
 * Provides shared flags and JSON output handling.
 *
 * ## Error Handling Patterns
 *
 * Commands should follow these patterns for consistent error handling:
 *
 * - **Fatal errors** (invalid args, missing auth, no access): Use `this.error(message)`.
 *   This throws and exits with a non-zero code. Appropriate for errors that prevent
 *   the command from running at all.
 *
 * - **No results** (empty diff, clean working tree, no PR found): Return gracefully.
 *   - In JSON mode: return `[]` (empty array)
 *   - In text mode: log a message with `this.log()` and return `undefined`
 *   This allows programmatic usage and testing without throwing.
 *
 * - **Warnings** (using defaults, skipping files): Use `this.warn(message)`.
 *   Outputs to stderr but continues execution.
 */
export abstract class BaseCommand<T extends typeof Command> extends Command {
  // Shared flags across all commands
  static baseFlags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to the distill configuration file (default: distill.yml in repo root)',
    }),
  }
  // Enable built-in --json flag for all commands
  static enableJsonFlag = true
  protected args!: InferredArgs<T>
  protected flags!: InferredFlags<T>

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    })
    this.flags = flags as InferredFlags<T>
    this.args = args as InferredArgs<T>
  }

  /**
   * Output reports, sorted by urgency.
   * When JSON is enabled, returns data for oclif to stringify including concerns.
   * Otherwise, logs text output to stdout.
   */
  protected outputReports(options: {concerns?: ConcernContext; reports: ReportOutput[]}): JsonOutput | void {
    const {concerns = {}, reports} = options

    // Sort by urgency (highest first)
    reports.sort((a, b) => b.urgency - a.urgency)

    const jsonReports = reports.map(
      (report) =>
        report.metadata || {
          diffText: '',
          fileName: '',
          message: report.content,
        },
    )

    if (this.jsonEnabled()) {
      // Return for oclif to handle JSON output
      return {concerns, reports: jsonReports}
    }

    // Normal text output
    for (const report of reports) {
      this.log(report.content)
    }
  }
}
