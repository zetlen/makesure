import {expect} from 'chai'

import {applyFilter, type FilterConfig} from '../../../src/lib/filters/index.js'
import {fixtures} from '../../fixtures/loader.js'

describe('applyFilter (orchestrator)', () => {
  it('routes to jq filter with FilterConfig', async () => {
    const versions = await fixtures.jq.package()
    const config: FilterConfig = {query: '.version', type: 'jq'}

    const result = await applyFilter(config, versions)

    expect(result).to.not.be.null
    expect(result!.left.artifact.trim()).to.equal('"1.0.0"')
    expect(result!.right.artifact.trim()).to.equal('"2.0.0"')
  })

  it('routes to regex filter with FilterConfig', async () => {
    const versions = await fixtures.regex.config()
    const config: FilterConfig = {pattern: 'API_KEY=.*', type: 'regex'}

    const result = await applyFilter(config, versions)

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.include('sk_test')
    expect(result!.right.artifact).to.include('sk_live')
  })

  it('routes to xpath filter with FilterConfig', async () => {
    const versions = await fixtures.xpath.pom()
    const config: FilterConfig = {
      expression: 'string(//*[local-name()="project"]/*[local-name()="version"])',
      type: 'xpath',
    }

    const result = await applyFilter(config, versions)

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('1.0.0')
    expect(result!.right.artifact).to.equal('2.0.0')
  })

  it('routes to tsq filter with FilterConfig', async () => {
    const versions = await fixtures.tsq.javascript()
    const config: FilterConfig = {
      capture: 'name',
      query: '(function_declaration name: (identifier) @name)',
      type: 'tsq',
    }

    const result = await applyFilter(config, versions, 'utils.js')

    expect(result).to.not.be.null
    expect(result!.right.artifact).to.include('validateEmail')
  })

  it('routes to ast-grep filter with FilterConfig', async () => {
    const versions = await fixtures.astGrep.javascript()
    const config: FilterConfig = {
      language: 'javascript',
      pattern: 'function $NAME($$$PARAMS) { $$$BODY }',
      type: 'ast-grep',
    }

    const result = await applyFilter(config, versions, 'utils.js')

    expect(result).to.not.be.null
    expect(result!.right.artifact).to.include('function validateEmail')
  })

  it('throws for unsupported filter type', async () => {
    const versions = {
      newContent: 'test2',
      oldContent: 'test',
    }

    try {
      // @ts-expect-error for testing
      await applyFilter({args: [], type: 'unknown'}, versions)
      expect.fail('Should have thrown')
    } catch (error) {
      expect((error as Error).message).to.include('Unsupported filter type')
    }
  })
})
