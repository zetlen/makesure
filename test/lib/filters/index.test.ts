import {expect} from 'chai'

import {applyFilter, applyJqFilter} from '../../../src/lib/filters/index.js'

describe('filters', () => {
  describe('applyJqFilter', () => {
    it('applies jq filter to JSON content', async () => {
      const versions = {
        newContent: '{"name": "test", "version": "2.0.0"}',
        oldContent: '{"name": "test", "version": "1.0.0"}',
      }

      const result = await applyJqFilter(versions, ['.version'])

      expect(result).to.not.be.null
      expect(result!.left.artifact.trim()).to.equal('"1.0.0"')
      expect(result!.right.artifact.trim()).to.equal('"2.0.0"')
      // diff output includes the lines with leading +/- but may have other prefixes
      expect(result!.diffText).to.match(/-"1\.0\.0"/)
      expect(result!.diffText).to.match(/\+"2\.0\.0"/)
    })

    it('returns null when filtered content is identical', async () => {
      const versions = {
        newContent: '{"name": "test", "other": "different"}',
        oldContent: '{"name": "test", "other": "changed"}',
      }

      const result = await applyJqFilter(versions, ['.name'])

      expect(result).to.be.null
    })

    it('handles null old content (new file)', async () => {
      const versions = {
        newContent: '{"name": "test"}',
        oldContent: null,
      }

      const result = await applyJqFilter(versions, ['.name'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('')
      expect(result!.right.artifact.trim()).to.equal('"test"')
    })

    it('handles null new content (deleted file)', async () => {
      const versions = {
        newContent: null,
        oldContent: '{"name": "test"}',
      }

      const result = await applyJqFilter(versions, ['.name'])

      expect(result).to.not.be.null
      expect(result!.left.artifact.trim()).to.equal('"test"')
      expect(result!.right.artifact).to.equal('')
    })

    it('returns null when both contents are null', async () => {
      const versions = {
        newContent: null,
        oldContent: null,
      }

      const result = await applyJqFilter(versions, ['.name'])

      expect(result).to.be.null
    })

    it('handles complex jq queries', async () => {
      const versions = {
        newContent: '{"dependencies": {"foo": "1.0", "baz": "3.0"}}',
        oldContent: '{"dependencies": {"foo": "1.0", "bar": "2.0"}}',
      }

      const result = await applyJqFilter(versions, ['.dependencies | keys'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.include('bar')
      expect(result!.right.artifact).to.include('baz')
    })
  })

  describe('applyFilter', () => {
    it('routes to jq filter for type "jq"', async () => {
      const versions = {
        newContent: '{"a": 2}',
        oldContent: '{"a": 1}',
      }

      const result = await applyFilter({args: ['.a'], type: 'jq'}, versions)

      expect(result).to.not.be.null
      expect(result!.left.artifact.trim()).to.equal('1')
      expect(result!.right.artifact.trim()).to.equal('2')
    })

    it('throws for unsupported filter type', async () => {
      const versions = {
        newContent: 'test2',
        oldContent: 'test',
      }

      try {
        await applyFilter({args: [], type: 'unknown'}, versions)
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('Unsupported filter type')
      }
    })
  })
})
