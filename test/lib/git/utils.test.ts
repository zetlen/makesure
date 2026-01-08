import {expect} from 'chai'
import {execFile} from 'node:child_process'
import {mkdtemp, realpath, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {promisify} from 'node:util'

import {
  getCurrentBranch,
  getGitDiff,
  getGitToplevel,
  getWorkingTreeStatus,
  isInsideGitRepo,
  isValidRef,
} from '../../../src/lib/git/utils.js'

const execFileAsync = promisify(execFile)

describe('git utils', () => {
  let tempDir: string

  beforeEach(async () => {
    // Use realpath to resolve symlinks (macOS /var -> /private/var)
    tempDir = await realpath(await mkdtemp(join(tmpdir(), 'distill-test-')))
  })

  afterEach(async () => {
    await rm(tempDir, {force: true, recursive: true})
  })

  async function initGitRepo(): Promise<void> {
    await execFileAsync('git', ['init'], {cwd: tempDir})
    await execFileAsync('git', ['config', 'user.email', 'test@test.com'], {cwd: tempDir})
    await execFileAsync('git', ['config', 'user.name', 'Test'], {cwd: tempDir})
  }

  describe('getGitToplevel', () => {
    it('returns the git repository root', async () => {
      await initGitRepo()
      const result = await getGitToplevel(tempDir)
      const resolvedTemp = await realpath(tempDir)
      expect(result).to.equal(resolvedTemp)
    })

    it('throws user-friendly error when not in a git repo', async () => {
      try {
        await getGitToplevel(tempDir)
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('Not a git repository')
        expect((error as Error).message).to.include(tempDir)
      }
    })
  })

  describe('isInsideGitRepo', () => {
    it('returns true when inside a git repo', async () => {
      await initGitRepo()
      const result = await isInsideGitRepo(tempDir)
      expect(result).to.be.true
    })

    it('returns false when not inside a git repo', async () => {
      const result = await isInsideGitRepo(tempDir)
      expect(result).to.be.false
    })
  })

  describe('isValidRef', () => {
    it('returns true for valid refs', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})

      const result = await isValidRef('HEAD', tempDir)
      expect(result).to.be.true
    })

    it('returns false for invalid refs', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})

      const result = await isValidRef('nonexistent-branch', tempDir)
      expect(result).to.be.false
    })

    it('returns false for "." (working directory)', async () => {
      await initGitRepo()
      const result = await isValidRef('.', tempDir)
      expect(result).to.be.false
    })

    it('returns false for empty string', async () => {
      await initGitRepo()
      const result = await isValidRef('', tempDir)
      expect(result).to.be.false
    })
  })

  describe('getWorkingTreeStatus', () => {
    it('returns isClean=true for clean working tree', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})

      const status = await getWorkingTreeStatus(tempDir)
      expect(status.isClean).to.be.true
      expect(status.hasStaged).to.be.false
      expect(status.hasUnstaged).to.be.false
    })

    it('detects unstaged changes', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world')

      const status = await getWorkingTreeStatus(tempDir)
      expect(status.isClean).to.be.false
      expect(status.hasUnstaged).to.be.true
      expect(status.hasStaged).to.be.false
    })

    it('detects staged changes', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})

      const status = await getWorkingTreeStatus(tempDir)
      expect(status.isClean).to.be.false
      expect(status.hasStaged).to.be.true
      expect(status.hasUnstaged).to.be.false
    })

    it('detects both staged and unstaged changes', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world!')

      const status = await getWorkingTreeStatus(tempDir)
      expect(status.isClean).to.be.false
      expect(status.hasStaged).to.be.true
      expect(status.hasUnstaged).to.be.true
    })
  })

  describe('getCurrentBranch', () => {
    it('returns the current branch name', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})

      const branch = await getCurrentBranch(tempDir)
      // Could be 'main' or 'master' depending on git config
      expect(branch).to.be.oneOf(['main', 'master'])
    })

    it('returns null for detached HEAD', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
      await execFileAsync('git', ['checkout', '--detach', 'HEAD'], {cwd: tempDir})

      const branch = await getCurrentBranch(tempDir)
      expect(branch).to.be.null
    })
  })

  describe('getGitDiff', () => {
    it('generates diff between two commits', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'update'], {cwd: tempDir})

      const diff = await getGitDiff('HEAD~1', 'HEAD', tempDir)
      expect(diff).to.include('-hello')
      expect(diff).to.include('+hello world')
    })

    it('generates diff with staged changes', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})

      const diff = await getGitDiff('HEAD', '.', tempDir, {staged: true})
      expect(diff).to.include('-hello')
      expect(diff).to.include('+hello world')
    })

    it('throws user-friendly error for invalid refs', async () => {
      await initGitRepo()
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})

      try {
        await getGitDiff('nonexistent', 'HEAD', tempDir)
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('Invalid git reference')
      }
    })
  })
})
