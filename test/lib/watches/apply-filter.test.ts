import {expect} from 'chai'

import {applyWatch, type WatchExtractionConfig} from '../../../src/lib/watches/index.js'
import {fixtures} from '../../fixtures/loader.js'

describe('applyWatch (orchestrator)', () => {
  it('routes to jq watch with WatchExtractionConfig', async () => {
    const versions = await fixtures.jq.package()
    const config: WatchExtractionConfig = {query: '.version', type: 'jq'}

    const result = await applyWatch(config, versions)

    expect(result).to.not.be.null
    expect(result!.left.artifact.trim()).to.equal('"1.0.0"')
    expect(result!.right.artifact.trim()).to.equal('"2.0.0"')
  })

  it('routes to regex watch with WatchExtractionConfig', async () => {
    const versions = await fixtures.regex.config()
    const config: WatchExtractionConfig = {pattern: 'API_KEY=.*', type: 'regex'}

    const result = await applyWatch(config, versions)

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.include('sk_test')
    expect(result!.right.artifact).to.include('sk_live')
  })

  it('routes to xpath watch with WatchExtractionConfig', async () => {
    const versions = await fixtures.xpath.pom()
    const config: WatchExtractionConfig = {
      expression: 'string(//*[local-name()="project"]/*[local-name()="version"])',
      type: 'xpath',
    }

    const result = await applyWatch(config, versions)

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('1.0.0')
    expect(result!.right.artifact).to.equal('2.0.0')
  })

  it('routes to tsq watch with WatchExtractionConfig', async () => {
    const versions = await fixtures.tsq.javascript()
    const config: WatchExtractionConfig = {
      capture: 'name',
      query: '(function_declaration name: (identifier) @name)',
      type: 'tsq',
    }

    const result = await applyWatch(config, versions, 'utils.js')

    expect(result).to.not.be.null
    expect(result!.right.artifact).to.include('validateEmail')
  })

  it('routes to ast-grep watch with WatchExtractionConfig', async () => {
    const versions = await fixtures.astGrep.javascript()
    const config: WatchExtractionConfig = {
      language: 'javascript',
      pattern: 'function $NAME($$$PARAMS) { $$$BODY }',
      type: 'ast-grep',
    }

    const result = await applyWatch(config, versions, 'utils.js')

    expect(result).to.not.be.null
    expect(result!.right.artifact).to.include('function validateEmail')
  })

  it('throws for unsupported watch type', async () => {
    const versions = {
      newContent: 'test2',
      oldContent: 'test',
    }

    try {
      // @ts-expect-error for testing
      await applyWatch({args: [], type: 'unknown'}, versions)
      expect.fail('Should have thrown')
    } catch (error) {
      expect((error as Error).message).to.include('Unsupported watch type')
    }
  })
})
