import {expect} from 'chai'

import {regexFilter} from '../../../src/lib/filters/index.js'
import {fixtures} from '../../fixtures/loader.js'

describe('regexFilter', () => {
  it('extracts API key changes from env file', async () => {
    const versions = await fixtures.regex.config()

    const result = await regexFilter.apply(versions, {pattern: 'API_KEY=.*', type: 'regex'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.include('sk_test_abc123def456')
    expect(result!.right.artifact).to.include('sk_live_newkey789ghi')
  })

  it('extracts all KEY= patterns from env file', async () => {
    const versions = await fixtures.regex.config()

    const result = await regexFilter.apply(versions, {pattern: '.*_KEY=.*', type: 'regex'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.include('API_KEY')
    expect(result!.left.artifact).to.include('SECRET_KEY')
  })

  it('extracts feature flag changes', async () => {
    const versions = await fixtures.regex.config()

    const result = await regexFilter.apply(versions, {pattern: 'FEATURE_.*=.*', type: 'regex'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.include('FEATURE_DARK_MODE=false')
    expect(result!.right.artifact).to.include('FEATURE_DARK_MODE=true')
    expect(result!.right.artifact).to.include('FEATURE_NEW_UI=true')
  })

  it('returns null when matches are identical', async () => {
    const versions = await fixtures.regex.config()

    // DATABASE_PORT is 5432 in both versions
    const result = await regexFilter.apply(versions, {pattern: 'DATABASE_PORT=5432', type: 'regex'})

    expect(result).to.be.null
  })

  it('supports case-insensitive matching', async () => {
    const versions = {
      newContent: 'FOO bar',
      oldContent: 'foo bar',
    }

    const result = await regexFilter.apply(versions, {flags: 'i', pattern: 'foo', type: 'regex'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('foo')
    expect(result!.right.artifact).to.equal('FOO')
  })

  it('handles null content', async () => {
    const versions = {
      newContent: 'API_KEY=secret123',
      oldContent: null,
    }

    const result = await regexFilter.apply(versions, {pattern: 'API_KEY=.*', type: 'regex'})

    expect(result).to.not.be.null
    expect(result!.left.artifact).to.equal('')
    expect(result!.right.artifact).to.include('secret123')
  })
})
