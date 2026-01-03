import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('diff:annotate', () => {
  it('runs diff:annotate cmd', async () => {
    const {stdout} = await runCommand('diff:annotate')
    expect(stdout).to.contain('hello world')
  })

  it('runs diff:annotate --name oclif', async () => {
    const {stdout} = await runCommand('diff:annotate --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
