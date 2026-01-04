import {expect} from 'chai'

import {applyFilter, applyJqFilter, applyRegexFilter, applyTsqFilter, applyXpathFilter} from '../../../src/lib/filters/index.js'

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

    it('routes to regex filter for type "regex"', async () => {
      const versions = {
        newContent: 'hello world\nfoo bar\nhello again',
        oldContent: 'hello world\nfoo baz\nhello again',
      }

      const result = await applyFilter({args: ['hello.*'], type: 'regex'}, versions)

      expect(result).to.be.null // Both have same "hello" matches
    })

    it('routes to xpath filter for type "xpath"', async () => {
      const versions = {
        newContent: '<root><item>new</item></root>',
        oldContent: '<root><item>old</item></root>',
      }

      const result = await applyFilter({args: ['//item'], type: 'xpath'}, versions)

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.include('old')
      expect(result!.right.artifact).to.include('new')
    })

    it('routes to tsq filter for type "tsq"', async () => {
      const versions = {
        newContent: 'function bar() { return 2; }',
        oldContent: 'function foo() { return 1; }',
      }

      const result = await applyFilter(
        {args: ['(function_declaration name: (identifier) @fn-name)', 'fn-name', '.js'], type: 'tsq'},
        versions,
      )

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('foo')
      expect(result!.right.artifact).to.equal('bar')
    })
  })

  describe('applyRegexFilter', () => {
    it('extracts matching lines from content', async () => {
      const versions = {
        newContent: 'line1: foo\nline2: bar\nline3: foo',
        oldContent: 'line1: foo\nline2: baz\nline3: foo',
      }

      const result = await applyRegexFilter(versions, ['bar|baz'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('baz')
      expect(result!.right.artifact).to.equal('bar')
    })

    it('returns null when matches are identical', async () => {
      const versions = {
        newContent: 'foo bar baz\nqux quux',
        oldContent: 'foo bar baz\nother stuff',
      }

      const result = await applyRegexFilter(versions, ['foo.*baz'])

      expect(result).to.be.null
    })

    it('supports case-insensitive matching', async () => {
      const versions = {
        newContent: 'FOO bar',
        oldContent: 'foo bar',
      }

      // With case insensitive, both match "foo" and "FOO" respectively
      // But the actual matched strings are different, so this returns a result
      const result = await applyRegexFilter(versions, ['foo', 'i'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('foo')
      expect(result!.right.artifact).to.equal('FOO')
    })

    it('handles null content', async () => {
      const versions = {
        newContent: 'hello world',
        oldContent: null,
      }

      const result = await applyRegexFilter(versions, ['hello'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('')
      expect(result!.right.artifact).to.equal('hello')
    })

    it('throws when no pattern provided', async () => {
      const versions = {
        newContent: 'test',
        oldContent: 'test',
      }

      try {
        await applyRegexFilter(versions, [])
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('requires at least a pattern')
      }
    })
  })

  describe('applyXpathFilter', () => {
    it('extracts matching nodes from XML', async () => {
      const versions = {
        newContent: '<root><name>bob</name><age>30</age></root>',
        oldContent: '<root><name>alice</name><age>25</age></root>',
      }

      const result = await applyXpathFilter(versions, ['//name'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.include('alice')
      expect(result!.right.artifact).to.include('bob')
    })

    it('returns null when matched nodes are identical', async () => {
      const versions = {
        newContent: '<root><name>same</name><other>different2</other></root>',
        oldContent: '<root><name>same</name><other>different1</other></root>',
      }

      const result = await applyXpathFilter(versions, ['//name'])

      expect(result).to.be.null
    })

    it('handles XPath that returns text content', async () => {
      const versions = {
        newContent: '<root><item>new</item></root>',
        oldContent: '<root><item>old</item></root>',
      }

      const result = await applyXpathFilter(versions, ['string(//item)'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('old')
      expect(result!.right.artifact).to.equal('new')
    })

    it('handles null content', async () => {
      const versions = {
        newContent: '<root><item>value</item></root>',
        oldContent: null,
      }

      const result = await applyXpathFilter(versions, ['//item'])

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('')
      expect(result!.right.artifact).to.include('value')
    })

    it('throws when no expression provided', async () => {
      const versions = {
        newContent: '<root/>',
        oldContent: '<root/>',
      }

      try {
        await applyXpathFilter(versions, [])
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('requires at least an expression')
      }
    })
  })

  describe('applyTsqFilter', () => {
    it('extracts function declarations from JavaScript', async () => {
      const versions = {
        newContent: 'function hello() { return "world"; }\nfunction goodbye() { }',
        oldContent: 'function hello() { return "hello"; }',
      }

      const result = await applyTsqFilter(versions, ['(function_declaration) @fn'], 'test.js')

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.include('function hello')
      expect(result!.right.artifact).to.include('function hello')
      expect(result!.right.artifact).to.include('function goodbye')
    })

    it('extracts specific capture names', async () => {
      const versions = {
        newContent: 'function bar() { }',
        oldContent: 'function foo() { }',
      }

      const result = await applyTsqFilter(
        versions,
        ['(function_declaration name: (identifier) @name)', 'name'],
        'test.js',
      )

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('foo')
      expect(result!.right.artifact).to.equal('bar')
    })

    it('extracts class declarations from Python', async () => {
      const versions = {
        newContent: 'class NewClass:\n    pass',
        oldContent: 'class OldClass:\n    pass',
      }

      const result = await applyTsqFilter(
        versions,
        ['(class_definition name: (identifier) @class-name)', 'class-name'],
        'test.py',
      )

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('OldClass')
      expect(result!.right.artifact).to.equal('NewClass')
    })

    it('works with TypeScript', async () => {
      const versions = {
        newContent: 'interface Foo { x: number; y: number; }',
        oldContent: 'interface Foo { x: number; }',
      }

      const result = await applyTsqFilter(
        versions,
        ['(interface_declaration) @iface'],
        'test.ts',
      )

      expect(result).to.not.be.null
      expect(result!.right.artifact).to.include('y: number')
    })

    it('returns null when matches are identical', async () => {
      const versions = {
        newContent: 'function same() { }\nconst x = different;',
        oldContent: 'function same() { }\nconst y = other;',
      }

      const result = await applyTsqFilter(
        versions,
        ['(function_declaration) @fn'],
        'test.js',
      )

      expect(result).to.be.null
    })

    it('handles file extension override in args', async () => {
      const versions = {
        newContent: 'function bar() { }',
        oldContent: 'function foo() { }',
      }

      // Using file extension override in args (third element)
      const result = await applyTsqFilter(
        versions,
        ['(function_declaration name: (identifier) @name)', 'name', '.js'],
      )

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('foo')
      expect(result!.right.artifact).to.equal('bar')
    })

    it('throws when no query provided', async () => {
      const versions = {
        newContent: 'function foo() { }',
        oldContent: 'function foo() { }',
      }

      try {
        await applyTsqFilter(versions, [], 'test.js')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('requires at least a query')
      }
    })

    it('throws when language cannot be determined', async () => {
      const versions = {
        newContent: 'some content',
        oldContent: 'other content',
      }

      try {
        await applyTsqFilter(versions, ['(identifier) @id'])
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('requires a file extension')
      }
    })

    it('throws for unsupported language', async () => {
      const versions = {
        newContent: 'some content',
        oldContent: 'other content',
      }

      try {
        await applyTsqFilter(versions, ['(identifier) @id'], 'test.xyz')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).to.include('Unsupported language')
      }
    })
  })
})
