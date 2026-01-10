import {Args, Flags} from '@oclif/core'
import {execFile} from 'node:child_process'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'

import {BaseCommand, type JsonOutput} from '../lib/base-command.js'
import {loadConfig} from '../lib/configuration/loader.js'
import {parseDiff, type RefPair} from '../lib/diff/parser.js'
import {getGitDiff, getGitToplevel, getWorkingTreeStatus, isValidRef} from '../lib/git/index.js'
import {processFiles} from '../lib/processing/runner.js'
import {type ContentProvider} from '../lib/processing/types.js'

const execFileAsync = promisify(execFile)

interface ResolvedRefs {
  base: string
  diffOptions: {staged?: boolean}
  head: string
}

export default class DiffCommand extends BaseCommand<typeof DiffCommand> {
  static override args = {
    base: Args.string({
      description: 'Base commit-ish (e.g., HEAD~1, main). Defaults based on working tree state.',
      required: false,
    }),
    head: Args.string({
      description: 'Head commit-ish (e.g., HEAD, feat/foo, . for working directory). Defaults to "."',
      required: false,
    }),
  }
  static override description = `Annotate a git diff with semantic analysis based on configured rules.

When no arguments are provided, defaults are chosen based on the working tree state:
- If there are unstaged changes, compares HEAD to the working directory
- If there are only staged changes, use --staged to check them

When using --json, a "lineRange" field is included. Note that this range refers to the line numbers within the *filtered artifact* (the code snippet shown in the report), NOT the original source file.`
  static override examples = [
    '<%= config.bin %> <%= command.id %>                  # auto-detect changes',
    '<%= config.bin %> <%= command.id %> --staged         # check staged changes only',
    '<%= config.bin %> <%= command.id %> HEAD~1 HEAD',
    '<%= config.bin %> <%= command.id %> main feat/foo',
    '<%= config.bin %> <%= command.id %> HEAD .           # compare HEAD to working directory',
    '<%= config.bin %> <%= command.id %> main HEAD --repo ../other-project',
  ]
  static override flags = {
    repo: Flags.string({
      char: 'r',
      defaultHelp: 'Find the closest top-level git repo to the current directory',
      description: 'Path to git repository',
    }),
    staged: Flags.boolean({
      char: 's',
      default: false,
      description: 'Only check staged changes (when comparing with working directory)',
    }),
  }

  public async run(): Promise<JsonOutput | void> {
    // Resolve repository path - always validate via getGitToplevel for user-friendly errors
    const startPath = this.flags.repo ? resolve(process.cwd(), this.flags.repo) : process.cwd()
    const repoPath = await getGitToplevel(startPath)
    this.debug('found repo path', repoPath)

    // Resolve refs using smart defaults
    const resolved = await this.resolveRefs(this.args.base, this.args.head, repoPath, this.flags.staged)

    // No changes detected - exit gracefully
    if (!resolved) {
      return this.jsonEnabled() ? {reports: []} : undefined
    }

    const {base, diffOptions, head} = resolved
    this.debug('resolved refs', {base, diffOptions, head})

    // Resolve config path (default to distill.yml in repo root)
    const configPath = this.flags.config ? resolve(process.cwd(), this.flags.config) : join(repoPath, 'distill.yml')
    this.debug('found config path', configPath)

    // Load configuration
    const config = await loadConfig(configPath)
    this.debug('loaded config', config)

    // Generate diff using git
    const diffText = await getGitDiff(base, head, repoPath, diffOptions)
    if (!diffText.trim()) {
      if (this.jsonEnabled()) {
        return {reports: []}
      }

      this.log('No changes between %s and %s', base, head)
      return
    }

    // Parse the diff
    const {files} = parseDiff(diffText)
    if (files.length === 0) {
      if (this.jsonEnabled()) {
        return {reports: []}
      }

      this.log('No files found in diff')
      return
    }

    this.debug('Files in diff:', files)

    // Process all files and collect reports
    const refs: RefPair = {base, head}

    // Create a content provider backed by git show
    const contentProvider: ContentProvider = async (ref, path) => {
      try {
        const {stdout} = await execFileAsync('git', ['show', `${ref}:${path}`], {cwd: repoPath})
        return stdout
      } catch (error) {
        this.debug('failed to fetch file content', {error, path, ref})
        return null
      }
    }

    const result = await processFiles(files, config, {
      contentProvider,
      refs,
    })

    return this.outputReports(result)
  }

  /**
   * Resolve base and head refs using smart defaults based on working tree state.
   * Returns null if no changes are detected (caller should exit gracefully).
   *
   * Note: This method reads working tree status once at the start, then may call
   * isValidRef multiple times. In rare cases where files change during execution,
   * the logic could produce inconsistent results. This is acceptable for CLI usage.
   */
  private async resolveRefs(
    baseArg: string | undefined,
    headArg: string | undefined,
    repoPath: string,
    stagedFlag: boolean,
  ): Promise<null | ResolvedRefs> {
    // Case: Both arguments provided - use as-is
    if (baseArg && headArg) {
      return {base: baseArg, diffOptions: {staged: stagedFlag}, head: headArg}
    }

    const status = await getWorkingTreeStatus(repoPath)

    // Case: One argument provided
    if (baseArg && !headArg) {
      // Check if it's a ref or a path
      const isRef = await isValidRef(baseArg, repoPath)
      if (isRef) {
        // 2b: Is a ref -> use HEAD as base and that ref as head
        return {base: 'HEAD', diffOptions: {}, head: baseArg}
      }

      // 2a: Not a ref (path) -> use same logic as no args but with this path
      // Fall through to no-args logic with pathArg set
    }

    // Case: No arguments (or single path argument)
    const pathArg = baseArg && !(await isValidRef(baseArg, repoPath)) ? baseArg : '.'

    // 1a: Clean working tree
    if (status.isClean) {
      this.warn(
        'There are no changes in the working tree. Provide at least one reference to compare with the current commit.',
      )
      return null
    }

    // 1c: Staged changes exist
    if (status.hasStaged) {
      if (stagedFlag) {
        // 1ci: --staged supplied
        if (status.hasUnstaged) {
          // Log to stderr (warn goes to stderr)
          this.warn('Checking only staged changes. Omit --staged to check unstaged changes.')
        }

        return {base: 'HEAD', diffOptions: {staged: true}, head: pathArg}
      }

      // --staged not supplied but staged changes exist
      if (!status.hasUnstaged) {
        // Only staged, no unstaged: warn and return null (caller exits gracefully)
        this.warn('There are staged changes but no unstaged changes. Use --staged to check staged changes.')
        return null
      }

      // Both staged and unstaged exist, --staged not supplied
      // Warn about staged being skipped, check unstaged
      this.warn('Skipping staged changes. Use --staged to check them instead.')
    }

    // 1b: Unstaged changes (or both with --staged not supplied)
    if (status.hasUnstaged) {
      return {base: 'HEAD', diffOptions: {}, head: pathArg}
    }

    // Should not reach here, but fallback
    return {base: 'HEAD', diffOptions: {}, head: pathArg}
  }
}
