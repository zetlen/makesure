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
})
