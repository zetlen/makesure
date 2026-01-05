# ast-grep Filter Refactor: CLI Shell-out

**Date:** 2026-01-04

## Overview

Refactored the ast-grep filter from using `@ast-grep/napi` (Node.js native bindings) to shelling out to the `ast-grep` CLI. This provides better cross-platform compatibility, especially on Alpine/musl-based systems.

## Changes

### Why the Change

The `@ast-grep/napi` package:

- Doesn't support all languages that the CLI supports
- Has compatibility issues on Alpine/musl-based distributions
- Adds native binary dependencies that complicate deployment

The CLI approach:

- Supports all languages ast-grep supports
- Works on any platform where the CLI is installed
- Can be installed via system package managers (apk, brew, etc.)

### Implementation

The filter now uses two CLI approaches depending on the pattern type:

1. **Simple string patterns** - Uses `ast-grep run`:

   ```bash
   ast-grep run -p '<pattern>' --lang --stdin < language > --json
   ```

2. **Pattern objects with context/selector** - Uses `ast-grep scan --inline-rules`:
   ```bash
   ast-grep scan --inline-rules '<yaml-rule>' --json --stdin
   ```

### Configuration

The `AstGrepFilterConfig` type now supports:

```typescript
type AstGrepFilterConfig = {
  type: 'ast-grep'
  language: string // Required: typescript, javascript, python, go, etc.
  pattern:
    | string
    | {
        context: string // Full code context for parsing
        selector: string // AST node type to select
      }
}
```

### Examples

```yaml
# Simple pattern
- type: ast-grep
  language: python
  pattern: 'class $NAME'

# Pattern with context/selector for precise matching
- type: ast-grep
  language: typescript
  pattern:
    context: 'class C { static override args = $ARGS }'
    selector: public_field_definition
```

## Files Modified

- `src/lib/filters/ast-grep.ts` - Rewrote to shell out to CLI
- `test/lib/filters/filter-ast-grep.test.ts` - Removed napi import, fixed test bugs
- `package.json` - Removed `@ast-grep/napi` dependency
- `mise.toml` - Added ast-grep tool
- `Dockerfile` - Added ast-grep to apk install

## Other Fixes

- Fixed regex filter in `makesure.yml` - added `flags: "s"` for multiline matching
- Fixed typo in makesure.yml template (4 backticks -> 3)
- Updated test fixture config to use new schema format
