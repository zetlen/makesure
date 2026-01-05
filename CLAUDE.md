# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`makesure` is an oclif-based CLI tool that processes code changes with semantic rules. It analyzes git diffs and applies configurable rules to generate reports or run actions based on filtered file changes.

## Essential Commands

### Development

```bash
# Build the project (removes dist/ and compiles TypeScript)
npm run build

# Run in development mode
./bin/dev.js

# Run tests
npm test

# Run a single test file
mocha --forbid-only "test/commands/diff/annotate.test.ts"

# Lint the code
npm run lint

# Generate JSON schema from TypeScript config types
npm run generate-schema
```

### Running the CLI

```bash
# Using development build
./bin/dev.js <command>

# After building
./bin/run.js <command>

# Main usage: compare two commits
./bin/run.js diff:annotate HEAD~1 HEAD
./bin/run.js diff:annotate main feat/foo --config ./custom-rules.yml
```

## Architecture

### Configuration System

The core of makesure is a rule-based configuration system defined in `src/lib/configuration/config.ts`:

- **FileCheckset**: Maps file patterns (globs via `include`) to checks
- **Check**: Contains filters and actions to apply to matching files
- **Filter**: Processes files to extract relevant content for comparison
  - Filters run on both sides of a diff to produce artifacts A and B
  - Returns a `FilterResult` containing the diff text and both artifacts
- **Action**: What to do when a check triggers
  - **ReportAction**: Generates text reports using Handlebars templates with markdown support
  - **RunAction**: Executes arbitrary commands with environment variables from the filter results

Configuration is stored in `makesure.yml` at the project root, with JSON schema validation available via `makesure-schema.json`.

### Available Filters

| Filter     | Description                         | External Dependency         |
| ---------- | ----------------------------------- | --------------------------- |
| `jq`       | JSON processing with jq queries     | `jq` CLI                    |
| `regex`    | Regular expression pattern matching | None                        |
| `xpath`    | XPath queries for XML/HTML          | None                        |
| `tsq`      | Tree-sitter AST queries             | None (uses web-tree-sitter) |
| `ast-grep` | ast-grep pattern matching           | `ast-grep` CLI              |

### Filter Configuration Examples

```yaml
checksets:
  # jq filter for JSON
  - include: 'package.json'
    checks:
      - filters:
          - type: jq
            query: '.dependencies'
        actions:
          - urgency: 1
            template: 'Dependencies changed'

  # ast-grep with simple pattern
  - include: 'src/**/*.ts'
    checks:
      - filters:
          - type: ast-grep
            language: typescript
            pattern: 'function $NAME($$$PARAMS) { $$$BODY }'
        actions:
          - urgency: 1
            template: 'Function changed'

  # ast-grep with context/selector for precise matching
  - include: 'src/commands/**/*.ts'
    checks:
      - filters:
          - type: ast-grep
            language: typescript
            pattern:
              context: 'class C { static override args = $ARGS }'
              selector: public_field_definition
        actions:
          - urgency: 1
            template: 'Command args changed'

  # regex with dotAll flag for multiline
  - include: 'README.md'
    checks:
      - filters:
          - type: regex
            pattern: '<!-- start -->.*<!-- end -->'
            flags: 's'
        actions:
          - urgency: 1
            template: 'Section changed'
```

### Project Structure

- `src/index.ts`: Re-exports oclif's run function (standard oclif entry point)
- `src/commands/`: Command implementations
  - `diff/annotate.ts`: Main command that compares commits and applies rules
- `src/lib/`: Core library modules
  - `configuration/`: Config types (`config.ts`) and YAML loader (`loader.ts`)
  - `diff/`: Git diff parsing and file version retrieval
  - `filters/`: Filter implementations (jq, regex, xpath, tsq, ast-grep)
  - `actions/`: Action implementations (report with Handlebars)
- `test/`: Mocha/Chai tests using `@oclif/test`
  - `test/lib/filters/`: Individual test files per filter type
  - `test/fixtures/`: Test fixture files for various languages
- `bin/`: CLI executables (`dev.js` for development, `run.js` for production)

### TypeScript Configuration

- Uses ES modules (`"type": "module"` in package.json)
- Module system: `Node16` with `node16` resolution
- Target: ES2022
- Source in `src/`, compiled to `dist/`
- Tests use `ts-node` with ESM loader

### Testing

- Framework: Mocha with Chai assertions
- oclif testing utilities via `@oclif/test`
- Tests follow the pattern: `test/lib/filters/filter-*.test.ts` for each filter
- Run with `--forbid-only` to prevent committed `.only()` calls
- 90 tests covering all filters and core functionality

### External Dependencies

The following CLI tools must be installed for full functionality:

- `jq` - for the jq filter
- `ast-grep` - for the ast-grep filter

These are managed via `mise.toml` for local development. In Docker, they're installed via `apk`.
