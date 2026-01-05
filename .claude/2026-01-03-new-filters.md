# New Filter Types: regex, xpath, tsq

**Date:** 2026-01-03

## Overview

Implemented three new file filters for the `distill` diff:annotate command:

1. **regex** - Regular expression matching
2. **xpath** - XPath queries for XML/HTML
3. **tsq** - Tree-sitter queries for AST-based code analysis

## Filter Details

### regex

Extracts content matching a regular expression pattern.

**Args:** `[pattern, flags?]`

- `pattern`: JavaScript regex pattern
- `flags`: Optional flags (e.g., `i` for case-insensitive). `g` and `m` flags are always applied.

**Example config:**

```yaml
rules:
  - pattern: '**/*.env'
    rules:
      - filters:
          - type: regex
            args: ['API_KEY=.*']
        actions:
          - template: 'API key found in {{filePath}}'
            urgency: 10
```

### xpath

Extracts nodes from XML/HTML content using XPath expressions.

**Args:** `[expression, namespaces?]`

- `expression`: XPath expression
- `namespaces`: Optional JSON string mapping prefixes to namespace URIs

**Example config:**

```yaml
rules:
  - pattern: '**/pom.xml'
    rules:
      - filters:
          - type: xpath
            args: ["//dependency[groupId='com.example']/version"]
        actions:
          - template: 'Dependency version changed'
            urgency: 5
```

### tsq (Tree-Sitter Query)

Extracts AST nodes using tree-sitter's S-expression query syntax. This enables language-aware code analysis.

**Args:** `[query, captureName?, fileExtension?]`

- `query`: Tree-sitter query pattern (S-expression)
- `captureName`: Optional capture name to filter results (defaults to all captures)
- `fileExtension`: Optional file extension override for language detection

**Supported Languages:**
| Extension | Language |
|-----------|----------|
| `.js`, `.jsx`, `.mjs` | JavaScript |
| `.ts` | TypeScript |
| `.tsx` | TSX |
| `.py` | Python |
| `.go` | Go |
| `.java` | Java |
| `.rs` | Rust |
| `.c`, `.h` | C |
| `.cpp`, `.cxx`, `.hpp` | C++ |
| `.json` | JSON |

**Example queries:**

```yaml
# Find all function declarations in JavaScript
- type: tsq
  args: ['(function_declaration) @fn']

# Find function names only
- type: tsq
  args: ['(function_declaration name: (identifier) @name)', 'name']

# Find Python classes
- type: tsq
  args: ['(class_definition name: (identifier) @class-name)', 'class-name']

# Find TypeScript interfaces
- type: tsq
  args: ['(interface_declaration) @iface']

# Find Java methods with specific annotation
- type: tsq
  args: ['(method_declaration (modifiers (annotation name: (identifier) @ann)) (#eq? @ann "Override"))']
```

**Use cases:**

- Track changes to function signatures
- Monitor class inheritance changes
- Detect changes in exported APIs
- Find modifications to annotated methods
- Track interface/type definition changes

## Dependencies Added

**Runtime:**

- `web-tree-sitter` - WebAssembly tree-sitter bindings
- `@xmldom/xmldom` - XML DOM parsing
- `xpath` - XPath query evaluation

**Language grammars:**

- `tree-sitter-javascript`
- `tree-sitter-typescript`
- `tree-sitter-python`
- `tree-sitter-json`
- `tree-sitter-go`
- `tree-sitter-java`
- `tree-sitter-rust`
- `tree-sitter-c`
- `tree-sitter-cpp`

## Files Modified

- `src/lib/configuration/config.ts` - Added new filter types to `SupportedFileFilterName`
- `src/lib/filters/index.ts` - Implemented all three filters
- `src/commands/diff/annotate.ts` - Updated to pass `filePath` to `applyFilter`
- `test/lib/filters/index.test.ts` - Added comprehensive tests (22 new tests)
- `package.json` - Added new dependencies

## Tests

48 total tests passing, including:

- Basic filter functionality for each type
- Edge cases (null content, identical matches, error handling)
- Language detection for tsq filter
- File extension override support

## Tree-Sitter Query Syntax Reference

Tree-sitter queries use S-expressions:

```
(node_type) @capture-name                    # Match node type
(parent_type (child_type) @capture)          # Match nested structure
(node field: (child) @capture)               # Match by field name
((node) @n (#eq? @n "value"))               # Predicates for filtering
(node (_) @any-child)                        # Wildcard matching
```

For more details, see: https://tree-sitter.github.io/tree-sitter/using-parsers/queries
