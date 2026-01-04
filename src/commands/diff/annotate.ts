import {Args, Command, Flags} from '@oclif/core'
import {minimatch} from 'minimatch'
import {execFile} from 'node:child_process'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'

import type {MakesureConfig} from '../../lib/configuration/config.js'

import {executeReportAction, isReportAction, type ReportOutput} from '../../lib/actions/index.js'
import {loadConfig} from '../../lib/configuration/loader.js'
import {type File, type FileVersions, getFileVersions, parseDiff, type RefPair} from '../../lib/diff/parser.js'
import {applyFilter, type FilterResult} from '../../lib/filters/index.js'

const execFileAsync = promisify(execFile)

interface Rule {
  actions: unknown[]
  filters: {args: string[]; type: string}[]
}

interface FileRuleset {
  pattern: string
  rules: Rule[]
}

async function getGitToplevel(cwd: string): Promise<string> {
  const {stdout} = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {cwd})
  return stdout.trim()
}

async function getGitDiff(base: string, head: string, cwd: string): Promise<string> {
  const {stdout} = await execFileAsync('git', ['diff', base, head], {cwd})
  return stdout
}

async function processRule(rule: Rule, versions: FileVersions, filePath: string): Promise<ReportOutput[]> {
  const reports: ReportOutput[] = []

  // Apply filters
  let filterResult: FilterResult | null = null
  for (const filter of rule.filters) {
    // eslint-disable-next-line no-await-in-loop
    filterResult = await applyFilter(filter, versions)
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

async function processRuleset(
  ruleset: FileRuleset,
  file: File,
  refs: RefPair,
  cwd: string,
): Promise<ReportOutput[]> {
  const filePath = file.newPath || file.oldPath

  if (!minimatch(filePath, ruleset.pattern)) {
    return []
  }

  const versions = await getFileVersions(file, refs, cwd)
  const reports: ReportOutput[] = []

  for (const rule of ruleset.rules) {
    // eslint-disable-next-line no-await-in-loop
    const ruleReports = await processRule(rule, versions, filePath)
    reports.push(...ruleReports)
  }

  return reports
}

async function processFiles(
  files: File[],
  config: MakesureConfig,
  refs: RefPair,
  cwd: string,
): Promise<ReportOutput[]> {
  const reports: ReportOutput[] = []

  for (const file of files) {
    for (const ruleset of config.rules) {
      // eslint-disable-next-line no-await-in-loop
      const rulesetReports = await processRuleset(ruleset as FileRuleset, file, refs, cwd)
      reports.push(...rulesetReports)
    }
  }

  return reports
}

export default class DiffAnnotate extends Command {
  static override args = {
    base: Args.string({
      description: 'Base commit-ish (e.g., HEAD~1, main, a1b2c3d)',
      required: true,
    }),
    head: Args.string({
      description: 'Head commit-ish (e.g., HEAD, feat/foo, . for working directory)',
      required: true,
    }),
  }
static override description = 'Annotate a git diff with semantic analysis based on configured rules'
static override examples = [
    '<%= config.bin %> <%= command.id %> HEAD~1 HEAD',
    '<%= config.bin %> <%= command.id %> main feat/foo',
    '<%= config.bin %> <%= command.id %> HEAD . # compare HEAD to working directory',
    '<%= config.bin %> <%= command.id %> main HEAD --repo ../other-project',
  ]
static override flags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to the makesure configuration file (default: makesure.yml in repo root)',
    }),
    repo: Flags.string({
      char: 'r',
      description: 'Path to the git repository (default: toplevel of current directory)',
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(DiffAnnotate)

    // Resolve repository path
    const repoPath = flags.repo
      ? resolve(process.cwd(), flags.repo)
      : await getGitToplevel(process.cwd())

    // Resolve config path (default to makesure.yml in repo root)
    const configPath = flags.config
      ? resolve(process.cwd(), flags.config)
      : join(repoPath, 'makesure.yml')

    // Load configuration
    const config = await loadConfig(configPath)

    // Generate diff using git
    const diffText = await getGitDiff(args.base, args.head, repoPath)
    if (!diffText.trim()) {
      this.log('No changes between %s and %s', args.base, args.head)
      return
    }

    // Parse the diff
    const {files} = parseDiff(diffText)
    if (files.length === 0) {
      this.log('No files found in diff')
      return
    }

    // Process all files and collect reports
    const refs: RefPair = {base: args.base, head: args.head}
    const reports = await processFiles(files, config, refs, repoPath)

    // Output reports sorted by urgency (highest first)
    reports.sort((a, b) => b.urgency - a.urgency)
    for (const report of reports) {
      this.log(report.content)
    }
  }
}
