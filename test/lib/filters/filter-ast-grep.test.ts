import {expect} from 'chai'

import {astGrepFilter} from '../../../src/lib/filters/index.js'
import {fixtures} from '../../fixtures/loader.js'

describe('astGrepFilter', () => {
  describe('JavaScript', () => {
    it('extracts function declarations', async () => {
      const versions = await fixtures.astGrep.javascript()

      const result = await astGrepFilter.apply(
        versions,
        {language: 'javascript', pattern: 'function $NAME($$$PARAMS) { $$$BODY }', type: 'ast-grep'},
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
        {language: 'javascript', pattern: 'class $NAME { $$$BODY }', type: 'ast-grep'},
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
        {language: 'javascript', pattern: 'fetch($$$ARGS)', type: 'ast-grep'},
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
        {language: 'python', pattern: 'class $NAME', type: 'ast-grep'},
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
        {language: 'python', pattern: 'def $NAME($$$PARAMS)', type: 'ast-grep'},
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
        {language: 'python', pattern: 'class $NAME(Enum)', type: 'ast-grep'},
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
        {language: 'typescript', pattern: 'interface $NAME { $$$BODY }', type: 'ast-grep'},
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
        {language: 'typescript', pattern: 'type $NAME = $TYPE', type: 'ast-grep'},
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
        {language: 'go', pattern: 'func $NAME($$$PARAMS) $$$RET { $$$BODY }', type: 'ast-grep'},
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
        {language: 'go', pattern: 'type $NAME struct { $$$FIELDS }', type: 'ast-grep'},
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
        {language: 'java', pattern: 'class $NAME { $$$BODY }', type: 'ast-grep'},
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
        {language: 'java', pattern: 'interface $NAME { $$$BODY }', type: 'ast-grep'},
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
        {language: 'rust', pattern: 'impl $TYPE { $$$BODY }', type: 'ast-grep'},
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
        {language: 'rust', pattern: '#[derive($$$DERIVES)]', type: 'ast-grep'},
        'lib.rs',
      )

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.include('#[derive(Debug, Clone)]')
    })

    it('extracts test functions', async () => {
      const versions = await fixtures.astGrep.rust()

      const result = await astGrepFilter.apply(
        versions,
        {language: 'rust', pattern: '#[test]', type: 'ast-grep'},
        'lib.rs',
      )

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.include('#[test]')
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
        {language: 'typescript', pattern: 'function $NAME() { }', type: 'ast-grep'},
        'test.js',
      )

      expect(result).to.be.null
    })

    it('handles language override in config', async () => {
      const versions = {
        newContent: 'function bar() { }',
        oldContent: 'function foo() { }',
      }

      const result = await astGrepFilter.apply(versions, {
        language: 'javascript',
        pattern: 'function $NAME() { }',
        type: 'ast-grep',
      })

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.include('function foo')
      expect(result!.right.artifact).to.include('function bar')
    })

    it('returns null when no matches found', async () => {
      const versions = {
        newContent: 'const x = 1;',
        oldContent: 'const y = 2;',
      }

      // Pattern that won't match either version
      const result = await astGrepFilter.apply(versions, {
        language: 'javascript',
        pattern: 'function $NAME()',
        type: 'ast-grep',
      })

      // Both sides have no matches, so they're equal (empty)
      expect(result).to.be.null
    })

    it('returns null for both null content', async () => {
      const versions = {
        newContent: null,
        oldContent: null,
      }

      const result = await astGrepFilter.apply(versions, {
        language: 'javascript',
        pattern: 'function $NAME()',
        type: 'ast-grep',
      })

      expect(result).to.be.null
    })

    it('handles null old content (new file)', async () => {
      const versions = {
        newContent: 'function test() { return 1; }',
        oldContent: null,
      }

      const result = await astGrepFilter.apply(
        versions,
        {language: 'javascript', pattern: 'function $NAME() { $$$BODY }', type: 'ast-grep'},
        'test.js',
      )

      expect(result).to.not.be.null
      expect(result!.left.artifact).to.equal('')
      expect(result!.right.artifact).to.include('function test')
    })
  })
})
