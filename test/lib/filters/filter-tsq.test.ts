import {expect} from 'chai'

import {tsqFilter} from '../../../src/lib/filters'
import {fixtures} from '../../fixtures/loader.js'

describe('tsqFilter', () => {
  describe('JavaScript', () => {
    it('extracts function declarations', async () => {
      const versions = await fixtures.tsq.javascript()

      const result = await tsqFilter.apply(versions, {query: '(function_declaration) @fn', type: 'tsq'}, 'utils.js')

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

      const result = await tsqFilter.apply(versions, {query: '(interface_declaration) @iface', type: 'tsq'}, 'types.ts')

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
        {
          capture: 'name',
          query: '(type_declaration (type_spec name: (type_identifier) @name (struct_type)))',
          type: 'tsq',
        },
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

      const result = await tsqFilter.apply(versions, {query: '(impl_item) @impl', type: 'tsq'}, 'lib.rs')

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

      const result = await tsqFilter.apply(versions, {query: '(string) @str', type: 'tsq'}, 'config.json')

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

      const result = await tsqFilter.apply(versions, {query: '(function_declaration) @fn', type: 'tsq'}, 'test.js')

      expect(result).to.be.null
    })

    it('handles language override in config', async () => {
      const versions = {
        newContent: 'function bar() { }',
        oldContent: 'function foo() { }',
      }

      const result = await tsqFilter.apply(versions, {
        capture: 'name',
        language: '.js',
        query: '(function_declaration name: (identifier) @name)',
        type: 'tsq',
      })

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
