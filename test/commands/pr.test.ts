import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import nock from 'nock'
import {resolve} from 'node:path'

describe('pr', () => {
  const prNumber = '123'
  const repo = 'owner/repo'
  const token = 'gh_token'

  beforeEach(() => {
    process.env.GITHUB_TOKEN = token
    nock.disableNetConnect()
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
    delete process.env.GITHUB_TOKEN
  })

  it('requires GITHUB_TOKEN', async () => {
    delete process.env.GITHUB_TOKEN
    const {error} = await runCommand(`pr ${prNumber} --repo ${repo}`)
    expect(error?.message).to.contain('GITHUB_TOKEN environment variable is required')
  })

  it('runs analysis on PR', async () => {
    const scope = nock('https://api.github.com')
      .get('/repos/owner/repo/pulls/123')
      .reply(200, {
        base: {sha: 'base-sha'},
        head: {sha: 'head-sha'},
      })
      .get('/repos/owner/repo/pulls/123')
      .matchHeader('accept', 'application/vnd.github.v3.diff')
      .reply(
        200,
        `diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -1,3 +1,3 @@
 {
-  "dependencies": {}
+  "dependencies": {"foo": "1.0.0"}
 }
 `,
      )
      // Content fetching for package.json
      .get('/repos/owner/repo/contents/package.json?ref=base-sha')
      .reply(200, {
        content: Buffer.from('{"dependencies": {}}').toString('base64'),
        encoding: 'base64',
      })
      .get('/repos/owner/repo/contents/package.json?ref=head-sha')
      .reply(200, {
        content: Buffer.from('{"dependencies": {"foo": "1.0.0"}}').toString('base64'),
        encoding: 'base64',
      })

    const configPath = resolve('test/fixtures/test-config.yml')
    const {stdout} = await runCommand(`pr ${prNumber} --repo ${repo} --config ${configPath}`)

    expect(stdout).to.contain('# Test Report')
    expect(stdout).to.contain('Found changes in dependencies')

    scope.done()
  })

  describe('URL parsing', () => {
    it('accepts full GitHub PR URL', async () => {
      const scope = nock('https://api.github.com')
        .get('/repos/test-owner/test-repo')
        // eslint-disable-next-line camelcase
        .reply(200, {full_name: 'test-owner/test-repo'})
        .get('/repos/test-owner/test-repo/pulls/456')
        .reply(200, {
          base: {sha: 'base-sha'},
          head: {sha: 'head-sha'},
        })
        .get('/repos/test-owner/test-repo/pulls/456')
        .matchHeader('accept', 'application/vnd.github.v3.diff')
        .reply(200, '')

      const configPath = resolve('test/fixtures/test-config.yml')
      const {stdout} = await runCommand(`pr https://github.com/test-owner/test-repo/pull/456 --config ${configPath}`)

      expect(stdout).to.contain('No changes found in PR #456')
      scope.done()
    })

    it('rejects invalid GitHub URL format', async () => {
      const {error} = await runCommand(`pr https://github.com/invalid-url --repo ${repo}`)
      expect(error?.message).to.contain('Invalid GitHub PR URL format')
    })

    it('rejects non-numeric PR argument without URL', async () => {
      const {error} = await runCommand(`pr not-a-number --repo ${repo}`)
      expect(error?.message).to.contain('Invalid PR argument')
      expect(error?.message).to.contain('Expected a PR number or URL')
    })

    it('validates --repo flag format', async () => {
      const {error} = await runCommand(`pr 123 --repo invalid-format`)
      expect(error?.message).to.contain('Invalid --repo format')
      expect(error?.message).to.contain('Expected owner/repo')
    })
  })

  describe('empty PR diff', () => {
    it('returns empty JSON object for empty PR', async () => {
      const scope = nock('https://api.github.com')
        .get('/repos/owner/repo/pulls/123')
        .reply(200, {
          base: {sha: 'base-sha'},
          head: {sha: 'head-sha'},
        })
        .get('/repos/owner/repo/pulls/123')
        .matchHeader('accept', 'application/vnd.github.v3.diff')
        .reply(200, '')

      const configPath = resolve('test/fixtures/test-config.yml')
      const {stdout} = await runCommand(`pr ${prNumber} --repo ${repo} --config ${configPath} --json`)
      const result = JSON.parse(stdout)
      expect(result).to.have.property('concerns').that.deep.equals({})
      expect(result).to.have.property('reports').that.is.an('array').that.is.empty

      scope.done()
    })

    it('logs message for empty PR without JSON flag', async () => {
      const scope = nock('https://api.github.com')
        .get('/repos/owner/repo/pulls/123')
        .reply(200, {
          base: {sha: 'base-sha'},
          head: {sha: 'head-sha'},
        })
        .get('/repos/owner/repo/pulls/123')
        .matchHeader('accept', 'application/vnd.github.v3.diff')
        .reply(200, '')

      const configPath = resolve('test/fixtures/test-config.yml')
      const {stdout} = await runCommand(`pr ${prNumber} --repo ${repo} --config ${configPath}`)
      expect(stdout).to.contain('No changes found in PR #123')

      scope.done()
    })
  })

  describe('API error handling', () => {
    it('handles inaccessible repository gracefully', async () => {
      const scope = nock('https://api.github.com').get('/repos/private/repo').reply(404, {message: 'Not Found'})

      const {error} = await runCommand(`pr https://github.com/private/repo/pull/1`)
      expect(error?.message).to.contain('Cannot access repository')
      expect(error?.message).to.contain('Check that GITHUB_TOKEN has access')

      scope.done()
    })
  })
})
