# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`distill` is an oclif-based CLI tool that processes code changes with semantic rules. It analyzes git diffs and applies configurable rules to generate reports or run actions based on filtered file changes.

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
mocha --forbid-only "test/commands/diff.test.ts"

# Lint the code
npm run lint

# Generate JSON schema from TypeScript config types
npm run generate-schema

# Run distill on itself (dogfooding) - tests the tool on the current repo
npm run dogfood

# Format code with prettier
npm run format <files>

# Build Docker image
npm run build:docker
```

### Running the CLI

```bash
# Using development build
./bin/dev.js <command>

# After building
./bin/run.js <command>

# Main usage: compare two commits
./bin/run.js diff HEAD~1 HEAD
./bin/run.js diff main feat/foo --config ./custom-rules.yml

# Output as JSON (includes metadata with lineRange and symbolic context)
./bin/run.js diff HEAD~1 HEAD --json
```

## Architecture

### Configuration System

The core of distill is a rule-based configuration system defined in `src/lib/configuration/config.ts`:

- **FileCheckset**: Maps file patterns (globs via `include`) to checks
- **Check**: Contains filters and actions to apply to matching files
- **Filter**: Processes files to extract relevant content for comparison
  - Filters run on both sides of a diff to produce artifacts A and B
  - Returns a `FilterResult` containing the diff text, both artifacts, and optional metadata:
    - `lineRange`: Line numbers within the filtered artifact (for precise code location)
    - `context`: Symbolic context array (e.g., surrounding class/function names for ast-grep, tsq, regex)
- **Action**: What to do when a check triggers
  - **ReportAction**: Generates text reports using Handlebars templates with markdown support
  - **RunAction**: Executes arbitrary commands with environment variables from the filter results

Configuration is stored in `distill.yml` at the project root, with JSON schema validation available via `distill-schema.json`.

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

### JSON Output Format

The `--json` flag outputs structured report data with enhanced metadata:

```typescript
{
  content: string      // Rendered markdown report
  urgency: number      // Priority level (0-3)
  metadata: {
    fileName: string
    diffText: string
    message: string
    lineRange?: {      // Line numbers in the filtered artifact
      start: number
      end: number
    }
    context?: Array<{  // Symbolic context (class, function names, etc.)
      name: string
      type: string     // e.g., "class_declaration", "function_definition"
    }>
  }
}
```

**Important**: The `lineRange` refers to line numbers within the _filtered artifact_ (the extracted code snippet), not the original source file. This is especially relevant for filters like `jq` or `xpath` that transform the input.

The `context` array provides symbolic information about surrounding code structures (available for ast-grep, tsq, and regex filters), helping identify which class/function the change occurred in.

### Project Structure

- `src/index.ts`: Re-exports oclif's run function (standard oclif entry point)
- `src/commands/`: Command implementations
  - `diff.ts`: Main command that compares commits and applies rules
- `src/lib/`: Core library modules
  - `configuration/`: Config types (`config.ts`) and YAML loader (`loader.ts`)
  - `diff/`: Git diff parsing and file version retrieval (`parser.ts`)
  - `filters/`: Filter implementations (jq, regex, xpath, tsq, ast-grep)
    - `types.ts`: FilterResult interface with lineRange and context metadata
    - `utils.ts`: Shared utilities for extracting symbolic context
  - `actions/`: Action implementations (report with Handlebars, JSON output)
  - `tree-sitter.ts`: Tree-sitter language parsers and utilities
- `test/`: Mocha/Chai tests using `@oclif/test`
  - `test/commands/`: Command tests (diff.test.ts, diff-json.test.ts)
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

### Development Conventions

#### Code Quality

- **Git Hooks**: Lefthook runs pre-commit hooks for formatting and linting
  - Auto-formats staged files with prettier
  - Runs ESLint with auto-fix on staged TypeScript files
  - Validates commit messages with commitlint (conventional commits)
- **Linting**: ESLint with oclif and prettier configs
- **Formatting**: Prettier with plugins for shell scripts and TOML
- **Tests**: Run with `--forbid-only` to prevent committed `.only()` calls

#### Workflow Tips

- **Schema Generation**: After changing config types in `src/lib/configuration/config.ts`, run `npm run generate-schema` to update `distill-schema.json`
- **README Updates**: The README command documentation is auto-generated by oclif during `npm run prepack` or when running `npm run version`
- **Dogfooding**: Run `npm run dogfood` to test distill on itself using the `distill.yml` in the repo root
- **Self-Documentation**: The `distill.yml` file serves as both configuration for the project and a comprehensive example of all filter types

#### Key Files to Update Together

When making changes, these files often need to be updated together:

1. **Adding a new filter**:
   - `src/lib/filters/<name>.ts` - Implementation
   - `src/lib/filters/index.ts` - Add to router switch statement
   - `src/lib/configuration/config.ts` - Add to FilterConfig union type
   - Run `npm run generate-schema` to update schema
   - `test/lib/filters/filter-<name>.test.ts` - Add tests
   - `CLAUDE.md` - Update filter table and examples

2. **Changing command interface**:
   - `src/commands/**/*.ts` - Update args/flags
   - Run `npm run prepack` to update README
   - Update examples in command description

3. **Modifying configuration schema**:
   - `src/lib/configuration/config.ts` - Update types
   - Run `npm run generate-schema`
   - Update `distill.yml` if needed
   - Update documentation and examples
