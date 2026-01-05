import {expect} from 'chai'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {loadConfig} from '../../../src/lib/configuration/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('configuration/loader', () => {
  it('loads a YAML config file', async () => {
    const configPath = resolve(__dirname, '../../fixtures/test-config.yml')
    const config = await loadConfig(configPath)

    expect(config).to.have.property('checksets')
    expect(config.checksets).to.be.an('array').with.lengthOf(1)
    expect(config.checksets[0]).to.have.property('include', 'package.json')
  })

  it('parses nested rule structures', async () => {
    const configPath = resolve(__dirname, '../../fixtures/test-config.yml')
    const config = await loadConfig(configPath)

    const checkset = config.checksets[0]
    expect(checkset.checks).to.be.an('array').with.lengthOf(1)

    const check = checkset.checks[0]
    expect(check.filters).to.be.an('array').with.lengthOf(1)
    expect(check.filters[0]).to.deep.include({query: '.dependencies', type: 'jq'})

    expect(check.actions).to.be.an('array').with.lengthOf(1)
    expect(check.actions[0]).to.have.property('urgency', 1)
    expect(check.actions[0]).to.have.property('template').that.includes('Test Report')
  })
})
