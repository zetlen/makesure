import {Args, Command, Flags} from '@oclif/core'
import {execFile} from 'node:child_process'
import {resolve} from 'node:path'
import {promisify} from 'node:util'
import {Octokit} from 'octokit'

const execFileAsync = promisify(execFile)

import {loadConfig} from '../../lib/configuration/loader.js'
import {parseDiff} from '../../lib/diff/parser.js'
import {processFiles} from '../../lib/processing/runner.js'
import {type ContentProvider} from '../../lib/processing/types.js'

export default class AnnotatePr extends Command {
  static override args = {
    pr: Args.string({
      description: 'PR number or URL (optional: detects PR for current branch if omitted)',
      required: false,
    }),
  }
  static override description = 'Annotate a GitHub Pull Request'
  static override flags = {
    config: Flags.string({
      char: 'c',
      description: 'Path to the distill configuration file (default: distill.yml in repo root)',
    }),
    json: Flags.boolean({
      description: 'Output reports in JSON format',
    }),
    repo: Flags.string({
      char: 'r',
      description: 'GitHub repository (owner/repo). Required if not running in a git repo.',
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(AnnotatePr)

    const token = process.env.GITHUB_TOKEN
    if (!token) {
      this.error('GITHUB_TOKEN environment variable is required')
    }

    const octokit = new Octokit({auth: token})

    const {number, owner, repo} = args.pr
      ? await this.parsePrArg(args.pr, flags.repo)
      : await this.detectCurrentBranchPr(octokit, flags.repo)
    this.debug('parsed pr', {number, owner, repo})

    // Fetch PR details to get refs
    /* eslint-disable camelcase */
    const {data: pr} = await octokit.rest.pulls.get({
      owner,
      pull_number: number,
      repo,
    })
    /* eslint-enable camelcase */

    const refs = {
      base: pr.base.sha,
      head: pr.head.sha,
    }
    this.debug('found refs', refs)

    // Fetch config - currently purely local, but could be fetched remotely in future
    // For now, require local config or assume defaults if we were to support that
    // The plan said: "Allow local config override... Let's stick to local config for the rule definitions for now"
    const configPath = flags.config ? resolve(process.cwd(), flags.config) : resolve(process.cwd(), 'distill.yml')

    // We intentionally don't error immediately if config is missing,
    // loadConfig might throw or handle it.
    // However, since we are moving towards "remote" execution,
    // we should consider if we strictly need a local config.
    // The plan said: "Allow local config override... Let's stick to local config for the rule definitions for now"
    const config = await loadConfig(configPath)

    // Fetch Diff
    /* eslint-disable camelcase */
    const {data: diffText} = await octokit.rest.pulls.get({
      mediaType: {
        format: 'diff',
      },
      owner,
      pull_number: number,
      repo,
    })
    /* eslint-enable camelcase */

    // Octokit types this as a PR object, but with mediaType format='diff' it returns raw diff string
    const diffString = diffText as unknown as string

    if (!diffString.trim()) {
      if (flags.json) {
        this.log('[]')
      } else {
        this.log('No changes found in PR #%d', number)
      }

      return
    }

    const {files} = parseDiff(diffString)

    // Content Provider using Octokit
    const contentProvider: ContentProvider = async (ref, path) => {
      try {
        const {data} = await octokit.rest.repos.getContent({
          owner,
          path,
          ref,
          repo,
        })

        if ('content' in data && 'encoding' in data && data.encoding === 'base64') {
          return Buffer.from(data.content, 'base64').toString('utf8')
        }
        // If it's not base64 or doesn't have content (e.g. submodule or directory), we might need to handle it
        // For text files, it's usually base64

        return null
      } catch (error) {
        this.debug('failed to fetch remote content', {error, path, ref})
        return null
      }
    }

    const reports = await processFiles(files, config, {
      contentProvider,
      refs,
    })

    // Output reports
    reports.sort((a, b) => b.urgency - a.urgency)

    if (flags.json) {
      const jsonReports = reports.map(
        (report) =>
          report.metadata || {
            diffText: '',
            fileName: '',
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

  private async detectCurrentBranchPr(
    octokit: Octokit,
    repoFlag?: string,
  ): Promise<{number: number; owner: string; repo: string}> {
    // Get current branch
    let branch: string
    try {
      const {stdout} = await execFileAsync('git', ['branch', '--show-current'])
      branch = stdout.trim()
      if (!branch) {
        throw new Error('Not on a branch (detached HEAD?)')
      }
    } catch {
      throw new Error('Could not detect current branch. Please provide a PR number or URL.')
    }

    // Get repo info
    let owner: string
    let repo: string
    if (repoFlag) {
      const parts = repoFlag.split('/')
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new TypeError('Invalid repo format. Expected owner/repo')
      }

      ;[owner, repo] = parts
    } else {
      try {
        const {stdout} = await execFileAsync('git', ['remote', 'get-url', 'origin'])
        const match = stdout.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
        if (!match) {
          throw new Error('Could not parse GitHub remote URL')
        }

        owner = match[1]
        repo = match[2].replace(/\.git$/, '')
      } catch {
        throw new Error('Could not detect GitHub repo. Please provide --repo flag or a PR number/URL.')
      }
    }

    this.debug('detecting PR for branch', {branch, owner, repo})

    // Find PR for current branch
    const {data: prs} = await octokit.rest.pulls.list({
      head: `${owner}:${branch}`,
      owner,
      repo,
      state: 'open',
    })

    if (prs.length === 0) {
      throw new Error(`No open PR found for branch '${branch}' in ${owner}/${repo}`)
    }

    // Use the first (most recent) PR
    const pr = prs[0]
    this.debug('found PR for current branch', {number: pr.number, title: pr.title})

    return {number: pr.number, owner, repo}
  }

  private async parsePrArg(prArg: string, repoFlag?: string): Promise<{number: number; owner: string; repo: string}> {
    // Check if it's a URL
    if (prArg.startsWith('https://github.com/') || prArg.startsWith('http://github.com/')) {
      const match = prArg.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
      if (match) {
        return {number: Number.parseInt(match[3], 10), owner: match[1], repo: match[2]}
      }

      throw new TypeError(`Invalid GitHub PR URL format: ${prArg}`)
    }

    const number = Number.parseInt(prArg, 10)
    if (Number.isNaN(number)) {
      throw new TypeError(`Invalid PR argument: ${prArg}`)
    }

    if (!repoFlag) {
      // Try to detect from git remote
      try {
        const {stdout} = await execFileAsync('git', ['remote', 'get-url', 'origin'])
        const match = stdout.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
        if (match) {
          return {number, owner: match[1], repo: match[2].replace(/\.git$/, '')}
        }
      } catch {
        // Fall through to error
      }

      throw new Error(
        'Repo flag is required when PR argument is a number and not running in a git repo with a GitHub remote',
      )
    }

    const [owner, repo] = repoFlag.split('/')
    if (!owner || !repo) {
      throw new TypeError('Invalid repo format. Expected owner/repo')
    }

    return {number, owner, repo}
  }
}
