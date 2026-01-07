import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('diff', () => {
  it('requires base and head arguments', async () => {
    const {error} = await runCommand('diff')
    expect(error?.message).to.contain('Missing')
    expect(error?.message).to.contain('required arg')
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
})
