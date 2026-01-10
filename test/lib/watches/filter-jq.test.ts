import {expect} from 'chai'

import {jqFilter} from '../../../src/lib/watches/index.js'
import {fixtures} from '../../fixtures/loader.js'

describe('jqFilter', () => {
  it('extracts version from package.json', async () => {
    const versions = await fixtures.jq.package()

    const result = await jqFilter.apply(versions, {query: '.version', type: 'jq'})

    expect(result).to.not.be.null
    expect(result!.left.artifact.trim()).to.equal('"1.0.0"')
    expect(result!.right.artifact.trim()).to.equal('"2.0.0"')
    expect(result!.diffText).to.include('-"1.0.0"')
    expect(result!.diffText).to.include('+"2.0.0"')
  })

  it('extracts dependency names from package.json', async () => {
    const versions = await fixtures.jq.package()

    const result = await jqFilter.apply(versions, {query: '.dependencies | keys', type: 'jq'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.include('express')
    expect(result!.left.artifact).to.include('lodash')
    expect(result!.right.artifact).to.include('axios')
  })

  it('returns null when filtered content is identical', async () => {
    const versions = await fixtures.jq.package()

    // Package name is the same in both versions
    const result = await jqFilter.apply(versions, {query: '.name', type: 'jq'})

    expect(result).to.be.null
  })

  it('extracts script changes from package.json', async () => {
    const versions = await fixtures.jq.package()

    const result = await jqFilter.apply(versions, {query: '.scripts | keys', type: 'jq'})

    expect(result).to.not.be.null
    // v2 has a new "lint" script
    expect(result!.right.artifact).to.include('lint')
    expect(result!.left.artifact).to.not.include('lint')
  })

  it('handles null old content (new file)', async () => {
    const versions = {
      newContent: '{"name": "test"}',
      oldContent: null,
    }

    const result = await jqFilter.apply(versions, {query: '.name', type: 'jq'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('')
    expect(result!.right.artifact.trim()).to.equal('"test"')
  })

  it('handles null new content (deleted file)', async () => {
    const versions = {
      newContent: null,
      oldContent: '{"name": "test"}',
    }

    const result = await jqFilter.apply(versions, {query: '.name', type: 'jq'})

    expect(result).to.not.be.null
    expect(result!.left.artifact.trim()).to.equal('"test"')
    expect(result!.right.artifact).to.equal('')
  })

  it('returns null when both contents are null', async () => {
    const versions = {
      newContent: null,
      oldContent: null,
    }

    const result = await jqFilter.apply(versions, {query: '.name', type: 'jq'})

    expect(result).to.be.null
  })
})
