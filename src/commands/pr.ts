import {Args, Flags} from '@oclif/core'
import {resolve} from 'node:path'
import {Octokit} from 'octokit'

import {BaseCommand, type JsonOutput} from '../lib/base-command.js'
import {loadConfig} from '../lib/configuration/loader.js'
import {parseDiff} from '../lib/diff/parser.js'
import {getCurrentBranch, getRemotes, getTrackingBranch, isInsideGitRepo} from '../lib/git/index.js'
import {processFiles} from '../lib/processing/runner.js'
import {type ContentProvider} from '../lib/processing/types.js'

interface PrInfo {
  number: number
  owner: string
  remoteUrl?: string
  repo: string
}

export default class PrCommand extends BaseCommand<typeof PrCommand> {
  static override args = {
    pr: Args.string({
      description: 'PR number or URL (optional: detects PR for current branch if omitted)',
      required: false,
    }),
  }
  static override description = `Annotate a GitHub Pull Request.

When no argument is provided, detects the PR associated with the current branch.
Requires GITHUB_TOKEN environment variable for authentication.`
  static override examples = [
    '<%= config.bin %> <%= command.id %>                                # auto-detect PR for current branch',
    '<%= config.bin %> <%= command.id %> 123                            # PR number (uses detected remote)',
    '<%= config.bin %> <%= command.id %> https://github.com/owner/repo/pull/123',
    '<%= config.bin %> <%= command.id %> 123 --repo owner/repo',
  ]
  static override flags = {
    repo: Flags.string({
      char: 'r',
      description: 'GitHub repository (owner/repo). Required if not running in a git repo.',
    }),
  }

  public async run(): Promise<JsonOutput | void> {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      this.error('GITHUB_TOKEN environment variable is required')
    }

    const octokit = new Octokit({auth: token})

    // Detect context based on args
    const prInfo = this.args.pr ? await this.parsePrArg(this.args.pr, octokit) : await this.detectPrFromContext(octokit)

    const {number, owner, repo} = prInfo

    // Log the remote being used if it was auto-detected
    if (prInfo.remoteUrl) {
      this.log(`Using remote ${prInfo.remoteUrl}`)
    }

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

    // Fetch config - currently purely local
    const configPath = this.flags.config
      ? resolve(process.cwd(), this.flags.config)
      : resolve(process.cwd(), 'distill.yml')
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
      if (this.jsonEnabled()) {
        return {concerns: {}, reports: []}
      }

      this.log('No changes found in PR #%d', number)
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

        return null
      } catch (error) {
        this.debug('failed to fetch remote content', {error, path, ref})
        return null
      }
    }

    const result = await processFiles(files, config, {
      concerns: {},
      contentProvider,
      refs,
    })

    return this.outputReports(result)
  }

  private async detectPrFromContext(octokit: Octokit): Promise<PrInfo> {
    const cwd = process.cwd()

    // 1a: Check if we're in a git repo
    if (!(await isInsideGitRepo(cwd))) {
      this.error(
        'Not inside a git repository. Please provide a full PR URL (e.g., https://github.com/owner/repo/pull/123)',
      )
    }

    // Get GitHub remotes
    const remotes = await getRemotes(cwd)
    const githubRemotes = remotes.filter((r) => r.isGitHub)

    // 1b: No GitHub remotes
    if (githubRemotes.length === 0) {
      this.error('No GitHub remotes found. Please configure a GitHub remote or provide a full PR URL.')
    }

    // Warn if multiple GitHub remotes
    if (githubRemotes.length > 1) {
      this.warn(
        `Multiple GitHub remotes found: ${githubRemotes.map((r) => r.name).join(', ')}. Using '${githubRemotes[0].name}'.`,
      )
    }

    const remote = githubRemotes[0]
    const {owner, repo} = remote

    if (!owner || !repo) {
      this.error('Could not parse GitHub owner/repo from remote URL. Please provide a full PR URL.')
    }

    // Get current branch
    const branch = await getCurrentBranch(cwd)
    if (!branch) {
      this.error('Not on a branch (detached HEAD). Please checkout a branch or provide a PR number/URL.')
    }

    // 1c: Check for tracking branch
    const tracking = await getTrackingBranch(cwd)
    if (!tracking) {
      this.error(
        `There is no remote tracking branch associated with '${branch}', so a PR could not be deduced. ` +
          `Push your branch with 'git push -u ${remote.name} ${branch}' or provide a PR number/URL.`,
      )
    }

    this.debug('detecting PR for branch', {branch, owner, repo})

    // 1d/1e: Find PR for this branch
    const {data: prs} = await octokit.rest.pulls.list({
      head: `${owner}:${branch}`,
      owner,
      repo,
      state: 'open',
    })

    if (prs.length === 0) {
      this.error(
        `The current branch '${branch}' is not associated with a pull request at ${owner}/${repo}. ` +
          `Create a PR or provide a PR number/URL.`,
      )
    }

    const pr = prs[0]
    this.debug('found PR for current branch', {number: pr.number, title: pr.title})

    return {
      number: pr.number,
      owner,
      remoteUrl: remote.url,
      repo,
    }
  }

  private async parsePrArg(prArg: string, octokit: Octokit): Promise<PrInfo> {
    const cwd = process.cwd()

    // Full URL format
    if (prArg.startsWith('https://github.com/') || prArg.startsWith('http://github.com/')) {
      const match = prArg.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
      if (match) {
        // Verify we can authenticate to this repo
        const owner = match[1]
        const repo = match[2]
        const number = Number.parseInt(match[3], 10)

        try {
          await octokit.rest.repos.get({owner, repo})
        } catch {
          this.error(`Cannot access repository ${owner}/${repo}. Check that GITHUB_TOKEN has access.`)
        }

        return {number, owner, repo}
      }

      this.error(`Invalid GitHub PR URL format: ${prArg}`)
    }

    // PR number format - need repo context
    const number = Number.parseInt(prArg, 10)
    if (Number.isNaN(number)) {
      this.error(`Invalid PR argument: ${prArg}. Expected a PR number or URL.`)
    }

    // Try to get repo from --repo flag first
    if (this.flags.repo) {
      const [owner, repo] = this.flags.repo.split('/')
      if (!owner || !repo) {
        this.error('Invalid --repo format. Expected owner/repo')
      }

      return {number, owner, repo}
    }

    // 1a for arg provided: Not in git repo
    if (!(await isInsideGitRepo(cwd))) {
      this.error(`PR number '${number}' provided but not in a git repository. Provide a full URL or use --repo flag.`)
    }

    // Try to detect from remotes
    const remotes = await getRemotes(cwd)
    const githubRemotes = remotes.filter((r) => r.isGitHub)

    if (githubRemotes.length === 0) {
      this.error(`PR number '${number}' provided but no GitHub remotes found. Provide a full URL or use --repo flag.`)
    }

    if (githubRemotes.length > 1) {
      this.warn(
        `Multiple GitHub remotes found: ${githubRemotes.map((r) => r.name).join(', ')}. Using '${githubRemotes[0].name}'.`,
      )
    }

    const remote = githubRemotes[0]
    if (!remote.owner || !remote.repo) {
      this.error('Could not parse GitHub owner/repo from remote URL. Please provide a full PR URL or use --repo flag.')
    }

    return {
      number,
      owner: remote.owner,
      remoteUrl: remote.url,
      repo: remote.repo,
    }
  }
}
