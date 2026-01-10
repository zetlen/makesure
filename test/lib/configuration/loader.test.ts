import {expect} from 'chai'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {Signal} from '../../../src/lib/configuration/config.js'
import {loadConfig} from '../../../src/lib/configuration/loader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('configuration/loader', () => {
  it('loads a YAML config file', async () => {
    const configPath = resolve(__dirname, '../../fixtures/test-config.yml')
    const config = await loadConfig(configPath)

    expect(config).to.have.property('concerns')
    expect(config.concerns).to.be.an('object')
    expect(config.concerns['test-concern']).to.exist
  })

  it('parses nested signal structures', async () => {
    const configPath = resolve(__dirname, '../../fixtures/test-config.yml')
    const config = await loadConfig(configPath)

    const concern = config.concerns['test-concern']
    expect(concern.signals).to.be.an('array').with.lengthOf(1)

    // Cast to Signal since we know the test fixture uses inline signals
    const signal = concern.signals[0] as Signal
    expect(signal).to.have.property('watch')
    expect(signal.watch).to.deep.include({
      include: 'package.json',
      query: '.dependencies',
      type: 'jq',
    })

    expect(signal).to.have.property('report')
    expect(signal.report).to.have.property('type', 'handlebars')
    expect(signal.report).to.have.property('template').that.includes('Test Report')
  })
})
