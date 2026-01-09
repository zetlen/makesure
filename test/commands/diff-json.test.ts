import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('diff JSON', () => {
  it('outputs empty JSON object when no changes', async () => {
    const {stdout} = await runCommand('diff HEAD HEAD --json')
    const json = JSON.parse(stdout)
    expect(json).to.have.property('concerns').that.deep.equals({})
    expect(json).to.have.property('reports').that.is.an('array').that.is.empty
  })

  // Note: Testing actual changes is harder without setting up a real git repo with changes.
  // For now, ensuring it returns valid JSON is a good start.
  // We can try to rely on the current repo state if we want to test "with changes",
  // but that depends on the environment.
  // The existing test uses `HEAD HEAD` which is safe.
})
