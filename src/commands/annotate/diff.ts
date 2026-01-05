import {Args, Command, Flags} from '@oclif/core'
import {execFile} from 'node:child_process'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'

import {loadConfig} from '../../lib/configuration/loader.js'
import {parseDiff, type RefPair} from '../../lib/diff/parser.js'
import {processFiles} from '../../lib/processing/runner.js'
import {type ContentProvider} from '../../lib/processing/types.js'

const execFileAsync = promisify(execFile)

export default class AnnotateDiff extends Command {
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
  static override description = `Annotate a git diff with semantic analysis based on configured rules.
  
  When using --json, a "lineRange" field is included. Note that this range refers to the line numbers within the *filtered artifact* (the code snippet shown in the report), NOT the original source file.
  
  Future versions may map these back to original source lines for supported filters (ast-grep, tsq, xpath).`
  static override examples = [
    '<%= config.bin %> <%= command.id %> HEAD~1 HEAD',
    '<%= config.bin %> <%= command.id %> main feat/foo',
    '<%= config.bin %> <%= command.id %> HEAD . # compare HEAD to working directory',
    '<%= config.bin %> <%= command.id %> main HEAD --repo ../other-project',
  ]
  static override flags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to the distill configuration file (default: distill.yml in repo root)',
    }),
    json: Flags.boolean({
      description:
        'Output reports in JSON format. Note: "lineRange" in metadata is relative to the filtered artifact, not necessarily the original source file. For some filters (like jq/xpath), exact source line mapping may be approximate.',
    }),
    repo: Flags.string({
      char: 'r',
      defaultHelp: 'Find the closest top-level git repo to the current directory',
      description: 'Path to git repository',
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(AnnotateDiff)

    // Resolve repository path
    const repoPath = flags.repo ? resolve(process.cwd(), flags.repo) : await this.getGitToplevel(process.cwd())
    this.debug('found repo path', repoPath)

    // Resolve config path (default to distill.yml in repo root)
    const configPath = flags.config ? resolve(process.cwd(), flags.config) : join(repoPath, 'distill.yml')
    this.debug('found config path', configPath)

    // Load configuration
    const config = await loadConfig(configPath)
    this.debug('loaded config', config)

    // Generate diff using git
    const diffText = await this.getGitDiff(args.base, args.head, repoPath)
    if (!diffText.trim()) {
      if (flags.json) {
        this.log('[]')
      } else {
        this.log('No changes between %s and %s', args.base, args.head)
      }

      return
    }

    // Parse the diff
    const {files} = parseDiff(diffText)
    if (files.length === 0) {
      if (flags.json) {
        this.log('[]')
      } else {
        this.log('No files found in diff')
      }

      return
    }

    this.debug('Files in diff:', files)

    // Process all files and collect reports
    const refs: RefPair = {base: args.base, head: args.head}

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

    const reports = await processFiles(files, config, {
      contentProvider,
      refs,
    })

    // Output reports sorted by urgency (highest first)
    reports.sort((a, b) => b.urgency - a.urgency)

    if (flags.json) {
      const jsonReports = reports.map(
        (report) =>
          report.metadata || {
            diffText: '',
            fileName: '', // Fallback if metadata is missing (should not happen with updated actions)
            message: report.content,
          },
      )
      this.log(JSON.stringify(jsonReports, null, 2))
    } else {
      for (const report of reports) {
        this.log(report.content)
      }
    }
  }

  private async getGitDiff(base: string, head: string, cwd: string): Promise<string> {
    const {stdout} = await execFileAsync('git', ['diff', base, head], {cwd})
    return stdout
  }

  private async getGitToplevel(cwd: string): Promise<string> {
    const {stdout} = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {cwd})
    return stdout.trim()
  }
}
