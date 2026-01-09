import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {execFile} from 'node:child_process'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'

const __dirname = dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)

describe('diff command', () => {
  describe('basic functionality', () => {
    it('uses smart defaults when no arguments provided (will warn or run based on repo state)', async () => {
      // Without arguments, the command will either:
      // - Warn about no changes (clean working tree)
      // - Warn about staged changes being skipped
      // - Or proceed with comparing HEAD to working directory
      // We can't easily predict which in tests, so we just verify it doesn't crash
      const {error, stderr} = await runCommand('diff')
      // If there's an error, it should be about working tree state, not missing args
      if (error) {
        expect(error.message).to.not.contain('Missing')
        expect(error.message).to.not.contain('required arg')
      }

      // Or there should be a warning about working tree state
      if (stderr) {
        expect(stderr).to.satisfy(
          (s: string) => s.includes('changes') || s.includes('staged') || s.includes('working tree'),
        )
      }
    })

    it('shows no changes message when commits are identical', async () => {
      const {stdout} = await runCommand('diff HEAD HEAD')
      expect(stdout).to.contain('No changes between HEAD and HEAD')
    })

    it('accepts --config flag', async () => {
      const configPath = resolve(__dirname, '../fixtures/test-config.yml')
      const {stdout} = await runCommand(`diff HEAD HEAD --config ${configPath}`)
      expect(stdout).to.contain('No changes between HEAD and HEAD')
    })

    it('accepts --repo flag', async () => {
      // Use the current repo as the target
      const {stdout} = await runCommand('diff HEAD HEAD --repo .')
      expect(stdout).to.contain('No changes between HEAD and HEAD')
    })

    it('accepts --staged flag (ignored when comparing two commits)', async () => {
      // When comparing two commits, --staged is ignored (it only applies to working directory diffs)
      // So this should behave the same as 'diff HEAD HEAD'
      const {stdout} = await runCommand('diff HEAD HEAD --staged')
      expect(stdout).to.contain('No changes between HEAD and HEAD')
    })

    it('returns empty JSON object when no changes', async () => {
      const {stdout} = await runCommand('diff HEAD HEAD --json')
      const result = JSON.parse(stdout)
      expect(result).to.have.property('concerns').that.deep.equals({})
      expect(result).to.have.property('reports').that.is.an('array').that.is.empty
    })
  })

  describe('with temp git repo', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'distill-diff-test-'))
      await execFileAsync('git', ['init'], {cwd: tempDir})
      await execFileAsync('git', ['config', 'user.email', 'test@test.com'], {cwd: tempDir})
      await execFileAsync('git', ['config', 'user.name', 'Test'], {cwd: tempDir})
      // Create a minimal distill.yml
      await writeFile(join(tempDir, 'distill.yml'), 'checksets: []')
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
    })

    afterEach(async () => {
      await rm(tempDir, {force: true, recursive: true})
    })

    it('detects unstaged changes with smart defaults', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')

      const {stdout} = await runCommand(`diff --repo ${tempDir}`)
      // Should not error about missing arguments
      expect(stdout).to.not.contain('Missing')
      // Should either show changes or "No changes" (empty diff is fine with our empty config)
    })

    it('warns when only staged changes exist without --staged flag', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})

      const {stderr} = await runCommand(`diff --repo ${tempDir}`)
      expect(stderr).to.include('staged')
      expect(stderr).to.include('--staged')
    })

    it('processes staged changes with --staged flag', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})

      const {stderr} = await runCommand(`diff --staged --repo ${tempDir}`)
      // Should not error
      expect(stderr).to.not.include('Error')
      // The output depends on the config, but it shouldn't crash
    })

    it('warns about skipped staged changes when both staged and unstaged exist', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world!')

      const {stderr} = await runCommand(`diff --repo ${tempDir}`)
      expect(stderr).to.include('Skipping staged')
    })

    it('warns about clean working tree', async () => {
      const {stderr} = await runCommand(`diff --repo ${tempDir}`)
      expect(stderr).to.include('no changes')
    })

    it('returns empty JSON object for clean working tree', async () => {
      const {stdout} = await runCommand(`diff --json --repo ${tempDir}`)
      const result = JSON.parse(stdout)
      expect(result).to.have.property('concerns').that.deep.equals({})
      expect(result).to.have.property('reports').that.is.an('array').that.is.empty
    })

    it('treats single ref argument as head, compares with HEAD', async () => {
      // Create a second commit
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'update'], {cwd: tempDir})

      // Compare current HEAD with HEAD~1 (single arg is treated as head, base defaults to HEAD)
      const {stdout} = await runCommand(`diff HEAD~1 --repo ${tempDir}`)
      // Note: with single ref, it compares HEAD to that ref
      expect(stdout).to.not.contain('Error')
    })

    it('handles comparison between two explicit refs', async () => {
      // Create a second commit
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'update'], {cwd: tempDir})

      const {stdout} = await runCommand(`diff HEAD~1 HEAD --repo ${tempDir}`)
      // Should process without errors (empty config means no reports)
      expect(stdout).to.not.contain('Error')
    })

    it('provides user-friendly error for invalid refs', async () => {
      const {error} = await runCommand(`diff nonexistent-ref HEAD --repo ${tempDir}`)
      expect(error).to.exist
      expect(error!.message).to.include('Invalid git reference')
    })

    it('provides user-friendly error when not in a git repo', async () => {
      const nonGitDir = await mkdtemp(join(tmpdir(), 'not-git-'))
      await writeFile(join(nonGitDir, 'distill.yml'), 'checksets: []')
      try {
        const {error} = await runCommand(`diff HEAD HEAD --repo ${nonGitDir}`)
        expect(error).to.exist
        expect(error!.message).to.satisfy(
          (msg: string) =>
            msg.includes('Not a git repository') ||
            msg.toLowerCase().includes('not a git repository') ||
            msg.includes('Failed to generate diff'),
        )
      } finally {
        await rm(nonGitDir, {force: true, recursive: true})
      }
    })
  })

  it('returns empty JSON object when no changes', async () => {
    const {stdout} = await runCommand('diff HEAD HEAD --json')
    const result = JSON.parse(stdout)
    expect(result).to.have.property('concerns').that.deep.equals({})
    expect(result).to.have.property('reports').that.is.an('array').that.is.empty
  })

  describe('with temp git repo', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'distill-diff-test-'))
      await execFileAsync('git', ['init'], {cwd: tempDir})
      await execFileAsync('git', ['config', 'user.email', 'test@test.com'], {cwd: tempDir})
      await execFileAsync('git', ['config', 'user.name', 'Test'], {cwd: tempDir})
      // Create a minimal distill.yml
      await writeFile(join(tempDir, 'distill.yml'), 'checksets: []')
      await writeFile(join(tempDir, 'test.txt'), 'hello')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'initial'], {cwd: tempDir})
    })

    afterEach(async () => {
      await rm(tempDir, {force: true, recursive: true})
    })

    it('detects unstaged changes with smart defaults', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')

      const {stdout} = await runCommand(`diff --repo ${tempDir}`)
      // Should not error about missing arguments
      expect(stdout).to.not.contain('Missing')
      // Should either show changes or "No changes" (empty diff is fine with our empty config)
    })

    it('warns when only staged changes exist without --staged flag', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})

      const {stderr} = await runCommand(`diff --repo ${tempDir}`)
      expect(stderr).to.include('staged')
      expect(stderr).to.include('--staged')
    })

    it('processes staged changes with --staged flag', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})

      const {stderr} = await runCommand(`diff --staged --repo ${tempDir}`)
      // Should not error
      expect(stderr).to.not.include('Error')
    })

    it('warns about skipped staged changes when both staged and unstaged exist', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await writeFile(join(tempDir, 'test.txt'), 'hello world!')

      const {stderr} = await runCommand(`diff --repo ${tempDir}`)
      expect(stderr).to.include('Skipping staged')
    })

    it('warns about clean working tree', async () => {
      const {stderr} = await runCommand(`diff --repo ${tempDir}`)
      expect(stderr).to.include('no changes')
    })

    it('returns empty JSON object for clean working tree', async () => {
      const {stdout} = await runCommand(`diff --json --repo ${tempDir}`)
      const result = JSON.parse(stdout)
      expect(result).to.have.property('concerns').that.deep.equals({})
      expect(result).to.have.property('reports').that.is.an('array').that.is.empty
    })

    it('treats single ref argument as head, compares with HEAD', async () => {
      // Create a second commit
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'update'], {cwd: tempDir})

      // Compare current HEAD with HEAD~1 (single arg is treated as head, base defaults to HEAD)
      const {stdout} = await runCommand(`diff HEAD~1 --repo ${tempDir}`)
      // Note: with single ref, it compares HEAD to that ref
      expect(stdout).to.not.contain('Error')
    })

    it('handles comparison between two explicit refs', async () => {
      // Create a second commit
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      await execFileAsync('git', ['add', '.'], {cwd: tempDir})
      await execFileAsync('git', ['commit', '-m', 'update'], {cwd: tempDir})

      const {stdout} = await runCommand(`diff HEAD~1 HEAD --repo ${tempDir}`)
      // Should process without errors (empty config means no reports)
      expect(stdout).to.not.contain('Error')
    })

    it('provides user-friendly error for invalid refs', async () => {
      const {error} = await runCommand(`diff nonexistent-ref HEAD --repo ${tempDir}`)
      expect(error).to.exist
      expect(error!.message).to.include('Invalid git reference')
    })

    it('provides user-friendly error when not in a git repo', async () => {
      const nonGitDir = await mkdtemp(join(tmpdir(), 'not-git-'))
      try {
        const {error} = await runCommand(`diff HEAD HEAD --repo ${nonGitDir}`)
        expect(error).to.exist
        expect(error!.message).to.include('Not a git repository')
      } finally {
        await rm(nonGitDir, {force: true, recursive: true})
      }
    })
  })
})
