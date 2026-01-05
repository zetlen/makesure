import {expect} from 'chai'

import {xpathFilter} from '../../../src/lib/filters/index.js'
import {fixtures} from '../../fixtures/loader.js'
describe('xpathFilter', () => {
  it('extracts project version from pom.xml', async () => {
    const versions = await fixtures.xpath.pom()

    const result = await xpathFilter.apply(versions, {
      expression: 'string(//*[local-name()="project"]/*[local-name()="version"])',
      type: 'xpath',
    })

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('1.0.0')
    expect(result!.right.artifact).to.equal('2.0.0')
  })

  it('extracts all dependency versions from pom.xml', async () => {
    const versions = await fixtures.xpath.pom()

    const result = await xpathFilter.apply(versions, {
      expression: '//*[local-name()="dependency"]/*[local-name()="version"]',
      type: 'xpath',
    })

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.include('5.3.20')
    expect(result!.right.artifact).to.include('6.0.9')
  })

  it('extracts java version property', async () => {
    const versions = await fixtures.xpath.pom()

    const result = await xpathFilter.apply(versions, {
      expression: 'string(//*[local-name()="java.version"])',
      type: 'xpath',
    })

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('11')
    expect(result!.right.artifact).to.equal('17')
  })

  it('returns null when matched nodes are identical', async () => {
    const versions = await fixtures.xpath.pom()

    // modelVersion is 4.0.0 in both
    const result = await xpathFilter.apply(versions, {
      expression: 'string(//*[local-name()="modelVersion"])',
      type: 'xpath',
    })

    expect(result).to.be.null
  })

  it('handles null content', async () => {
    const versions = {
      newContent: '<root><item>value</item></root>',
      oldContent: null,
    }

    const result = await xpathFilter.apply(versions, {expression: '//item', type: 'xpath'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('')
    expect(result!.right.artifact).to.include('value')
  })
})
