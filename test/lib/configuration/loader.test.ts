import {expect} from 'chai'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {loadConfig} from '../../../src/lib/configuration/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('configuration/loader', () => {
  it('loads a YAML config file', async () => {
    const configPath = resolve(__dirname, '../../fixtures/test-config.yml')
    const config = await loadConfig(configPath)

    expect(config).to.have.property('rules')
    expect(config.rules).to.be.an('array').with.lengthOf(1)
    expect(config.rules[0]).to.have.property('pattern', 'package.json')
  })

  it('parses nested rule structures', async () => {
    const configPath = resolve(__dirname, '../../fixtures/test-config.yml')
    const config = await loadConfig(configPath)

    const ruleset = config.rules[0]
    expect(ruleset.rules).to.be.an('array').with.lengthOf(1)

    const rule = ruleset.rules[0]
    expect(rule.filters).to.be.an('array').with.lengthOf(1)
    expect(rule.filters[0]).to.deep.include({args: ['.dependencies'], type: 'jq'})

    expect(rule.actions).to.be.an('array').with.lengthOf(1)
    expect(rule.actions[0]).to.have.property('urgency', 1)
    expect(rule.actions[0]).to.have.property('template').that.includes('Test Report')
  })
})
