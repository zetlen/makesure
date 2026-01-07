import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)

export interface WorkingTreeStatus {
  hasStaged: boolean
  hasUnstaged: boolean
  isClean: boolean
}

export interface RemoteInfo {
  isGitHub: boolean
  name: string
  owner?: string
  repo?: string
  url: string
}

export interface TrackingBranchInfo {
  branch: string
  fullRef: string
  remote: string
}

/**
 * Check working tree status for staged/unstaged changes
 */
export async function getWorkingTreeStatus(cwd: string): Promise<WorkingTreeStatus> {
  // Check for staged changes
  let hasStaged = false
  try {
    await execFileAsync('git', ['diff', '--cached', '--quiet'], {cwd})
  } catch {
    // Non-zero exit means there ARE staged changes
    hasStaged = true
  }

  // Check for unstaged changes
  let hasUnstaged = false
  try {
    await execFileAsync('git', ['diff', '--quiet'], {cwd})
  } catch {
    // Non-zero exit means there ARE unstaged changes
    hasUnstaged = true
  }

  return {
    hasStaged,
    hasUnstaged,
    isClean: !hasStaged && !hasUnstaged,
  }
}

/**
 * Check if a string is a valid git reference
 */
export async function isValidRef(ref: string, cwd: string): Promise<boolean> {
  // Special case: "." means working directory, not a ref
  if (ref === '.' || ref === '') {
    return false
  }

  try {
    await execFileAsync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {cwd})
    return true
  } catch {
    return false
  }
}

/**
 * Get git repository top-level directory
 */
export async function getGitToplevel(cwd: string): Promise<string> {
  const {stdout} = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {cwd})
  return stdout.trim()
}

/**
 * Check if current directory is inside a git repository
 */
export async function isInsideGitRepo(cwd: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {cwd})
    return true
  } catch {
    return false
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(cwd: string): Promise<null | string> {
  try {
    const {stdout} = await execFileAsync('git', ['branch', '--show-current'], {cwd})
    const branch = stdout.trim()
    return branch || null // Empty string means detached HEAD
  } catch {
    return null
  }
}

/**
 * Get tracking branch info for current branch
 */
export async function getTrackingBranch(cwd: string): Promise<null | TrackingBranchInfo> {
  try {
    const {stdout} = await execFileAsync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], {
      cwd,
    })
    const fullRef = stdout.trim()
    // Parse "origin/main" into remote="origin", branch="main"
    const [remote, ...branchParts] = fullRef.split('/')
    return {
      branch: branchParts.join('/'),
      fullRef,
      remote,
    }
  } catch {
    return null
  }
}

/**
 * Get all configured remotes with parsed GitHub info
 */
export async function getRemotes(cwd: string): Promise<RemoteInfo[]> {
  try {
    const {stdout} = await execFileAsync('git', ['remote', '-v'], {cwd})
    const remotes = new Map<string, RemoteInfo>()

    for (const line of stdout.split('\n')) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)$/)
      if (match) {
        const [, name, url] = match
        const githubMatch = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
        remotes.set(name, {
          isGitHub: Boolean(githubMatch),
          name,
          owner: githubMatch?.[1],
          repo: githubMatch?.[2]?.replace(/\.git$/, ''),
          url,
        })
      }
    }

    return [...remotes.values()]
  } catch {
    return []
  }
}

/**
 * Generate git diff with various modes.
 *
 * Note: --staged only works when comparing a commit with the working directory.
 * When comparing two commits, --staged is ignored.
 */
export async function getGitDiff(
  base: string,
  head: string,
  cwd: string,
  options: {staged?: boolean} = {},
): Promise<string> {
  const args = ['diff']

  // --staged (--cached) only works when comparing with index/working directory
  // git diff --staged HEAD compares staged changes with HEAD
  // git diff HEAD . compares working directory with HEAD
  if (options.staged && (head === '.' || head === '')) {
    // Compare staged changes against base
    args.push('--staged', base)
  } else {
    // Normal diff between two refs
    args.push(base, head)
  }

  const {stdout} = await execFileAsync('git', args, {cwd})
  return stdout
}
