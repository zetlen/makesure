import {expect} from 'chai'

import {
  applyFilter,
  astGrepFilter,
  type FilterConfig,
  jqFilter,
  regexFilter,
  tsqFilter,
  xpathFilter,
} from '../../../src/lib/filters/index.js'
import {fixtures} from '../../fixtures/loader.js'

describe('filters', () => {
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

  describe('tsqFilter', () => {
    describe('JavaScript', () => {
      it('extracts function declarations', async () => {
        const versions = await fixtures.tsq.javascript()

        const result = await tsqFilter.apply(
          versions,
          {query: '(function_declaration) @fn', type: 'tsq'},
          'utils.js',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('function calculateSum')
        expect(result!.left.artifact).to.include('function formatCurrency')
        expect(result!.right.artifact).to.include('function validateEmail')
        expect(result!.right.artifact).to.include('function calculateDifference')
      })

      it('extracts function names only', async () => {
        const versions = await fixtures.tsq.javascript()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(function_declaration name: (identifier) @name)', type: 'tsq'},
          'utils.js',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('calculateSum')
        expect(result!.right.artifact).to.include('validateEmail')
        expect(result!.right.artifact).to.include('calculateDifference')
      })

      it('extracts class declarations', async () => {
        const versions = await fixtures.tsq.javascript()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(class_declaration name: (identifier) @name)', type: 'tsq'},
          'utils.js',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('UserService')
        expect(result!.right.artifact).to.include('CacheService')
      })
    })

    describe('TypeScript', () => {
      it('extracts interface declarations', async () => {
        const versions = await fixtures.tsq.typescript()

        const result = await tsqFilter.apply(
          versions,
          {query: '(interface_declaration) @iface', type: 'tsq'},
          'types.ts',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('interface User')
        expect(result!.right.artifact).to.include('interface Order')
        expect(result!.right.artifact).to.include('interface PaginatedResponse')
      })

      it('extracts interface names only', async () => {
        const versions = await fixtures.tsq.typescript()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(interface_declaration name: (type_identifier) @name)', type: 'tsq'},
          'types.ts',
        )

        expect(result).to.not.be.null
        expect(result!.right.artifact).to.include('Order')
        expect(result!.right.artifact).to.include('PaginatedResponse')
      })

      it('extracts type aliases', async () => {
        const versions = await fixtures.tsq.typescript()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(type_alias_declaration name: (type_identifier) @name)', type: 'tsq'},
          'types.ts',
        )

        expect(result).to.not.be.null
        expect(result!.right.artifact).to.include('OrderStatus')
      })

      it('extracts class methods', async () => {
        const versions = await fixtures.tsq.typescript()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(method_definition name: (property_identifier) @name)', type: 'tsq'},
          'types.ts',
        )

        expect(result).to.not.be.null
        expect(result!.right.artifact).to.include('findByEmail')
        expect(result!.right.artifact).to.include('delete')
        expect(result!.right.artifact).to.include('findAll')
      })
    })

    describe('Python', () => {
      it('extracts class definitions', async () => {
        const versions = await fixtures.tsq.python()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(class_definition name: (identifier) @name)', type: 'tsq'},
          'models.py',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('User')
        expect(result!.left.artifact).to.include('UserRepository')
        expect(result!.right.artifact).to.include('OrderRepository')
        expect(result!.right.artifact).to.include('UserRole')
        expect(result!.right.artifact).to.include('OrderStatus')
      })

      it('extracts function definitions', async () => {
        const versions = await fixtures.tsq.python()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(function_definition name: (identifier) @name)', type: 'tsq'},
          'models.py',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('create_user')
        expect(result!.left.artifact).to.include('format_price')
        expect(result!.right.artifact).to.include('calculate_order_total')
        expect(result!.right.artifact).to.include('validate_email')
      })

      it('extracts decorated functions', async () => {
        const versions = await fixtures.tsq.python()

        const result = await tsqFilter.apply(
          versions,
          {query: '(decorated_definition) @decorated', type: 'tsq'},
          'models.py',
        )

        expect(result).to.not.be.null
        // Both have @dataclass decorated classes
        expect(result!.left.artifact).to.include('@dataclass')
        expect(result!.right.artifact).to.include('@dataclass')
      })
    })

    describe('Go', () => {
      it('extracts function declarations', async () => {
        const versions = await fixtures.tsq.go()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(function_declaration name: (identifier) @name)', type: 'tsq'},
          'handlers.go',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('NewUserHandler')
        expect(result!.right.artifact).to.include('NewProductHandler')
        expect(result!.right.artifact).to.include('sendJSON')
        expect(result!.right.artifact).to.include('sendError')
      })

      it('extracts struct type declarations', async () => {
        const versions = await fixtures.tsq.go()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(type_declaration (type_spec name: (type_identifier) @name (struct_type)))', type: 'tsq'},
          'handlers.go',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('User')
        expect(result!.left.artifact).to.include('UserHandler')
        expect(result!.right.artifact).to.include('Product')
        expect(result!.right.artifact).to.include('ApiResponse')
        expect(result!.right.artifact).to.include('ProductHandler')
      })

      it('extracts method declarations', async () => {
        const versions = await fixtures.tsq.go()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(method_declaration name: (field_identifier) @name)', type: 'tsq'},
          'handlers.go',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('GetUser')
        expect(result!.left.artifact).to.include('CreateUser')
        expect(result!.right.artifact).to.include('UpdateUser')
        expect(result!.right.artifact).to.include('DeleteUser')
        expect(result!.right.artifact).to.include('GetProduct')
        expect(result!.right.artifact).to.include('ListProducts')
      })
    })

    describe('Java', () => {
      it('extracts class declarations', async () => {
        const versions = await fixtures.tsq.java()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(class_declaration name: (identifier) @name)', type: 'tsq'},
          'UserService.java',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('UserService')
        expect(result!.left.artifact).to.include('User')
        expect(result!.right.artifact).to.include('ProductService')
        expect(result!.right.artifact).to.include('Product')
      })

      it('extracts interface declarations', async () => {
        const versions = await fixtures.tsq.java()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(interface_declaration name: (identifier) @name)', type: 'tsq'},
          'UserService.java',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('UserRepository')
        expect(result!.right.artifact).to.include('AuditLogger')
      })

      it('extracts method declarations', async () => {
        const versions = await fixtures.tsq.java()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(method_declaration name: (identifier) @name)', type: 'tsq'},
          'UserService.java',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('findById')
        expect(result!.left.artifact).to.include('save')
        expect(result!.right.artifact).to.include('findByEmail')
        expect(result!.right.artifact).to.include('findByRole')
        expect(result!.right.artifact).to.include('updateEmail')
      })

      it('extracts enum declarations', async () => {
        const versions = await fixtures.tsq.java()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(enum_declaration name: (identifier) @name)', type: 'tsq'},
          'UserService.java',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.equal('')
        expect(result!.right.artifact).to.include('UserRole')
      })
    })

    describe('Rust', () => {
      it('extracts struct definitions', async () => {
        const versions = await fixtures.tsq.rust()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(struct_item name: (type_identifier) @name)', type: 'tsq'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('User')
        expect(result!.left.artifact).to.include('UserRepository')
        expect(result!.right.artifact).to.include('Product')
        expect(result!.right.artifact).to.include('ProductRepository')
      })

      it('extracts impl blocks', async () => {
        const versions = await fixtures.tsq.rust()

        const result = await tsqFilter.apply(
          versions,
          {query: '(impl_item) @impl', type: 'tsq'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('impl User')
        expect(result!.left.artifact).to.include('impl UserRepository')
        expect(result!.right.artifact).to.include('impl Repository<User>')
        expect(result!.right.artifact).to.include('impl Repository<Product>')
      })

      it('extracts function definitions', async () => {
        const versions = await fixtures.tsq.rust()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(function_item name: (identifier) @name)', type: 'tsq'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('format_user')
        expect(result!.right.artifact).to.include('calculate_total')
        expect(result!.right.artifact).to.include('validate_email')
      })

      it('extracts enum definitions', async () => {
        const versions = await fixtures.tsq.rust()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(enum_item name: (type_identifier) @name)', type: 'tsq'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.equal('')
        expect(result!.right.artifact).to.include('UserRole')
      })

      it('extracts trait definitions', async () => {
        const versions = await fixtures.tsq.rust()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', query: '(trait_item name: (type_identifier) @name)', type: 'tsq'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.equal('')
        expect(result!.right.artifact).to.include('Repository')
      })
    })

    describe('JSON', () => {
      it('extracts all string values', async () => {
        const versions = await fixtures.tsq.json()

        const result = await tsqFilter.apply(
          versions,
          {query: '(string) @str', type: 'tsq'},
          'config.json',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('"development"')
        expect(result!.right.artifact).to.include('"production"')
        expect(result!.right.artifact).to.include('"us-east-1"')
      })

      it('extracts object keys', async () => {
        const versions = await fixtures.tsq.json()

        const result = await tsqFilter.apply(
          versions,
          {capture: 'key', query: '(pair key: (string) @key)', type: 'tsq'},
          'config.json',
        )

        expect(result).to.not.be.null
        expect(result!.right.artifact).to.include('"cache"')
        expect(result!.right.artifact).to.include('"region"')
        expect(result!.right.artifact).to.include('"ssl"')
      })
    })

    describe('error handling', () => {
      it('returns null when matches are identical', async () => {
        const versions = {
          newContent: 'function same() { }\nconst x = different;',
          oldContent: 'function same() { }\nconst y = other;',
        }

        const result = await tsqFilter.apply(
          versions,
          {query: '(function_declaration) @fn', type: 'tsq'},
          'test.js',
        )

        expect(result).to.be.null
      })

      it('handles language override in config', async () => {
        const versions = {
          newContent: 'function bar() { }',
          oldContent: 'function foo() { }',
        }

        const result = await tsqFilter.apply(
          versions,
          {capture: 'name', language: '.js', query: '(function_declaration name: (identifier) @name)', type: 'tsq'},
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.equal('foo')
        expect(result!.right.artifact).to.equal('bar')
      })

      it('throws when language cannot be determined', async () => {
        const versions = {
          newContent: 'some content',
          oldContent: 'other content',
        }

        try {
          await tsqFilter.apply(versions, {query: '(identifier) @id', type: 'tsq'})
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
          await tsqFilter.apply(versions, {query: '(identifier) @id', type: 'tsq'}, 'test.xyz')
          expect.fail('Should have thrown')
        } catch (error) {
          expect((error as Error).message).to.include('Unsupported language')
        }
      })
    })
  })

  describe('astGrepFilter', () => {
    describe('JavaScript', () => {
      it('extracts function declarations', async () => {
        const versions = await fixtures.astGrep.javascript()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'function $NAME($$$PARAMS) { $$$BODY }', type: 'ast-grep'},
          'utils.js',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('function calculateSum')
        expect(result!.left.artifact).to.include('function formatCurrency')
        expect(result!.right.artifact).to.include('function validateEmail')
        expect(result!.right.artifact).to.include('function calculateDifference')
      })

      it('extracts class declarations', async () => {
        const versions = await fixtures.astGrep.javascript()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'class $NAME { $$$BODY }', type: 'ast-grep'},
          'utils.js',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('class UserService')
        expect(result!.right.artifact).to.include('class CacheService')
      })

      it('extracts fetch calls', async () => {
        const versions = await fixtures.astGrep.javascript()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'fetch($$$ARGS)', type: 'ast-grep'},
          'utils.js',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('fetch')
        expect(result!.right.artifact).to.include('fetch')
      })
    })

    describe('Python', () => {
      it('extracts class definitions', async () => {
        const versions = await fixtures.astGrep.python()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'class $NAME', type: 'ast-grep'},
          'models.py',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('class User')
        expect(result!.left.artifact).to.include('class UserRepository')
        expect(result!.right.artifact).to.include('class OrderRepository')
      })

      it('extracts function definitions', async () => {
        const versions = await fixtures.astGrep.python()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'def $NAME($$$PARAMS)', type: 'ast-grep'},
          'models.py',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('def create_user')
        expect(result!.left.artifact).to.include('def format_price')
        expect(result!.right.artifact).to.include('def calculate_order_total')
        expect(result!.right.artifact).to.include('def validate_email')
      })

      it('extracts enum classes', async () => {
        const versions = await fixtures.astGrep.python()

        // v2 adds UserRole and OrderStatus enum classes that aren't in v1
        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'class $NAME(Enum)', type: 'ast-grep'},
          'models.py',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.equal('')
        expect(result!.right.artifact).to.include('class UserRole')
      })
    })

    describe('TypeScript', () => {
      it('extracts interface declarations', async () => {
        const versions = await fixtures.astGrep.typescript()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'interface $NAME { $$$BODY }', type: 'ast-grep'},
          'types.ts',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('interface User')
        // Note: Order and ApiResponse are new in v2, but ApiResponse<T> has generics
        // which won't match this simple pattern
        expect(result!.right.artifact).to.include('interface Order')
        expect(result!.right.artifact).to.include('interface Product')
      })

      it('extracts type aliases', async () => {
        const versions = await fixtures.astGrep.typescript()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'type $NAME = $TYPE', type: 'ast-grep'},
          'types.ts',
        )

        expect(result).to.not.be.null
        expect(result!.right.artifact).to.include('type OrderStatus')
      })
    })

    describe('Go', () => {
      it('extracts function declarations', async () => {
        const versions = await fixtures.astGrep.go()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'func $NAME($$$PARAMS) $$$RET { $$$BODY }', type: 'ast-grep'},
          'handlers.go',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('func NewUserHandler')
        expect(result!.right.artifact).to.include('func NewProductHandler')
      })

      it('extracts struct definitions', async () => {
        const versions = await fixtures.astGrep.go()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'type $NAME struct { $$$FIELDS }', type: 'ast-grep'},
          'handlers.go',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('type User struct')
        expect(result!.right.artifact).to.include('type Product struct')
        expect(result!.right.artifact).to.include('type ApiResponse struct')
      })
    })

    describe('Java', () => {
      it('extracts class declarations without modifiers', async () => {
        const versions = await fixtures.astGrep.java()

        // Note: ast-grep patterns match exactly, so 'class $NAME' won't match 'public class'.
        // We test for classes without access modifiers.
        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'class $NAME { $$$BODY }', type: 'ast-grep'},
          'UserService.java',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('class User')
        expect(result!.right.artifact).to.include('class Product')
      })

      it('extracts interface declarations', async () => {
        const versions = await fixtures.astGrep.java()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'interface $NAME { $$$BODY }', type: 'ast-grep'},
          'UserService.java',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('interface UserRepository')
        expect(result!.right.artifact).to.include('interface AuditLogger')
      })
    })

    describe('Rust', () => {
      it('extracts impl blocks', async () => {
        const versions = await fixtures.astGrep.rust()

        // Note: ast-grep patterns must match the exact AST structure.
        // 'pub struct' won't match 'struct $NAME', but impl blocks work.
        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'impl $TYPE { $$$BODY }', type: 'ast-grep'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('impl User')
        expect(result!.right.artifact).to.include('impl Product')
      })

      it('extracts derive macros', async () => {
        const versions = await fixtures.astGrep.rust()

        const result = await astGrepFilter.apply(
          versions,
          {pattern: '#[derive($$$DERIVES)]', type: 'ast-grep'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('#[derive(Debug, Clone)]')
      })

      it('extracts test modules', async () => {
        const versions = await fixtures.astGrep.rust()

        // The tests module changes between v1 and v2
        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'mod $NAME { $$$BODY }', type: 'ast-grep'},
          'lib.rs',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('mod tests')
        expect(result!.right.artifact).to.include('mod tests')
      })
    })

    describe('error handling', () => {
      it('returns null when matches are identical', async () => {
        const versions = {
          newContent: 'function same() { }\nconst x = different;',
          oldContent: 'function same() { }\nconst y = other;',
        }

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'function $NAME() { }', type: 'ast-grep'},
          'test.js',
        )

        expect(result).to.be.null
      })

      it('handles language override in config', async () => {
        const versions = {
          newContent: 'function bar() { }',
          oldContent: 'function foo() { }',
        }

        const result = await astGrepFilter.apply(
          versions,
          {language: 'javascript', pattern: 'function $NAME() { }', type: 'ast-grep'},
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.include('function foo')
        expect(result!.right.artifact).to.include('function bar')
      })

      it('throws when language cannot be determined', async () => {
        const versions = {
          newContent: 'some content',
          oldContent: 'other content',
        }

        try {
          await astGrepFilter.apply(versions, {pattern: 'function $NAME()', type: 'ast-grep'})
          expect.fail('Should have thrown')
        } catch (error) {
          expect((error as Error).message).to.include('requires a language')
        }
      })

      it('returns null for both null content', async () => {
        const versions = {
          newContent: null,
          oldContent: null,
        }

        const result = await astGrepFilter.apply(
          versions,
          {language: 'javascript', pattern: 'function $NAME()', type: 'ast-grep'},
        )

        expect(result).to.be.null
      })

      it('handles null old content (new file)', async () => {
        const versions = {
          newContent: 'function test() { return 1; }',
          oldContent: null,
        }

        const result = await astGrepFilter.apply(
          versions,
          {pattern: 'function $NAME() { $$$BODY }', type: 'ast-grep'},
          'test.js',
        )

        expect(result).to.not.be.null
        expect(result!.left.artifact).to.equal('')
        expect(result!.right.artifact).to.include('function test')
      })
    })
  })

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
        pattern: 'function $NAME($$$PARAMS) { $$$BODY }',
        type: 'ast-grep',
      }

      const result = await applyFilter(config, versions, 'utils.js')

      expect(result).to.not.be.null
      expect(result!.right.artifact).to.include('function validateEmail')
    })

    it('supports legacy args format for backwards compatibility', async () => {
      const versions = await fixtures.jq.package()

      const result = await applyFilter({args: ['.version'], type: 'jq'}, versions)

      expect(result).to.not.be.null
      expect(result!.left.artifact.trim()).to.equal('"1.0.0"')
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
