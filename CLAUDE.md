# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`distill` is an oclif-based CLI tool that processes code changes with semantic rules. It analyzes git diffs and applies configurable signals to generate reports based on watched file changes.

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

# Diff command with smart defaults
./bin/run.js diff                    # auto-detect changes in working tree
./bin/run.js diff --staged           # check only staged changes
./bin/run.js diff HEAD~1 HEAD        # compare two commits
./bin/run.js diff main feat/foo --config ./custom-rules.yml

# PR command with smart defaults
./bin/run.js pr                      # auto-detect PR for current branch
./bin/run.js pr 123                  # PR number (uses detected remote)
./bin/run.js pr https://github.com/owner/repo/pull/123

# Output as JSON (includes metadata with lineRange and symbolic context)
./bin/run.js diff HEAD~1 HEAD --json
./bin/run.js pr 123 --json
```

## Architecture

### Configuration System

The core of distill is a rule-based configuration system defined in `src/lib/configuration/config.ts`:

- **DistillConfig**: Root configuration with `concerns` and optional `defined` block
- **Concern**: An area of governance interest with signals
- **Signal**: Combines watch + report + notify (what to watch, how to report, who to notify)
- **Watch**: File patterns (`include`) + extraction config (type, query/pattern)
  - Watches run on both sides of a diff to produce artifacts A and B
  - Returns a `FilterResult` containing the diff text, both artifacts, and optional metadata:
    - `lineRange`: Line numbers within the filtered artifact (for precise code location)
    - `context`: Symbolic context array (e.g., surrounding class/function names for ast-grep, tsq, regex)
- **Report**: Output format with `type` (currently only 'handlebars') and `template`
- **Notify**: Dictionary of notification channels (github, slack, email, webhook, jira)

Configuration is stored in `distill.yml` at the project root, with JSON schema validation available via `distill-schema.json`.

### Available Watch Types

| Watch Type | Description                         | External Dependency         |
| ---------- | ----------------------------------- | --------------------------- |
| `jq`       | JSON processing with jq queries     | `jq` CLI                    |
| `regex`    | Regular expression pattern matching | None                        |
| `xpath`    | XPath queries for XML/HTML          | None                        |
| `tsq`      | Tree-sitter AST queries             | None (uses web-tree-sitter) |
| `ast-grep` | ast-grep pattern matching           | `ast-grep` CLI              |

### Configuration Examples

```yaml
concerns:
  security:
    signals:
      # jq watch for JSON
      - watch:
          include: 'package.json'
          type: jq
          query: '.dependencies'
        report:
          type: handlebars
          template: 'Dependencies changed'
        notify:
          github: '@security-team'

      # ast-grep with simple pattern
      - watch:
          include: 'src/**/*.ts'
          type: ast-grep
          language: typescript
          pattern: 'function $NAME($$$PARAMS) { $$$BODY }'
        report:
          type: handlebars
          template: 'Function changed'

      # ast-grep with context/selector for precise matching
      - watch:
          include: 'src/commands/**/*.ts'
          type: ast-grep
          language: typescript
          pattern:
            context: 'class C { static override args = $ARGS }'
            selector: public_field_definition
        report:
          type: handlebars
          template: 'Command args changed'

      # regex with dotAll flag for multiline
      - watch:
          include: 'README.md'
          type: regex
          pattern: '<!-- start -->.*<!-- end -->'
          flags: 's'
        report:
          type: handlebars
          template: 'Section changed'
```

### JSON Output Format

The `--json` flag outputs structured report data with enhanced metadata:

```typescript
{
  content: string      // Rendered markdown report
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

**Important**: The `lineRange` refers to line numbers within the _filtered artifact_ (the extracted code snippet), not the original source file. This is especially relevant for watches like `jq` or `xpath` that transform the input.

The `context` array provides symbolic information about surrounding code structures (available for ast-grep, tsq, and regex watches), helping identify which class/function the change occurred in.

### Project Structure

- `src/index.ts`: Re-exports oclif's run function (standard oclif entry point)
- `src/commands/`: Command implementations
  - `diff.ts`: Compares commits/working tree and applies rules (extends BaseCommand)
  - `pr.ts`: Analyzes GitHub PRs via API (extends BaseCommand)
- `src/lib/`: Core library modules
  - `base-command.ts`: Abstract base command with shared flags and `enableJsonFlag`
  - `configuration/`: Config types (`config.ts`), YAML loader (`loader.ts`), reference resolver (`resolver.ts`)
  - `diff/`: Git diff parsing and file version retrieval (`parser.ts`)
  - `git/`: Git utilities for working tree status, remote detection, etc.
    - `utils.ts`: Functions for `getWorkingTreeStatus`, `isValidRef`, `getRemotes`, etc.
    - `index.ts`: Re-exports
  - `watches/`: Watch implementations (jq, regex, xpath, tsq, ast-grep)
    - `types.ts`: FilterResult interface with lineRange and context metadata
    - `utils.ts`: Shared utilities for extracting symbolic context
  - `reports/`: Report implementations (handlebars templates, JSON output)
  - `processing/`: Processing runner and types for ContentProvider abstraction
  - `tree-sitter.ts`: Tree-sitter language parsers and utilities
- `test/`: Mocha/Chai tests using `@oclif/test`
  - `test/commands/`: Command tests (diff.test.ts, diff-json.test.ts, pr.test.ts)
  - `test/lib/watches/`: Individual test files per watch type
  - `test/fixtures/`: Test fixture files for various languages
- `bin/`: CLI executables (`dev.js` for development, `run.js` for production)

### Command Architecture

Commands extend `BaseCommand` from `src/lib/base-command.ts`, which provides:

- **`enableJsonFlag = true`**: Adds `--json` as a global flag; commands return data for JSON output
- **`baseFlags`**: Shared flags (`--config`) inherited by all commands
- **`outputReports()`**: Shared method for outputting reports (returns JSON data or logs text)

**Smart Defaults Pattern** (diff command):

- When no arguments provided, detects working tree state via `src/lib/git/utils.ts`
- `--staged` flag for checking only staged changes
- Single argument is checked with `isValidRef()` to determine if it's a ref or path

**Remote Detection Pattern** (pr command):

- Uses `getRemotes()` to find GitHub remotes
- `getTrackingBranch()` and `getCurrentBranch()` for branch detection
- Logs "Using remote <url>" when auto-detecting

### TypeScript Configuration

- Uses ES modules (`"type": "module"` in package.json)
- Module system: `Node16` with `node16` resolution
- Target: ES2022
- Source in `src/`, compiled to `dist/`
- Tests use `ts-node` with ESM loader

### Testing

- Framework: Mocha with Chai assertions
- oclif testing utilities via `@oclif/test`
- Tests follow the pattern: `test/lib/watches/filter-*.test.ts` for each watch type
- Run with `--forbid-only` to prevent committed `.only()` calls
- 137 tests covering all watches and core functionality

### External Dependencies

The following CLI tools must be installed for full functionality:

- `jq` - for the jq watch
- `ast-grep` - for the ast-grep watch

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
- **Self-Documentation**: The `distill.yml` file serves as both configuration for the project and a comprehensive example of all watch types

#### Key Files to Update Together

When making changes, these files often need to be updated together:

1. **Adding a new watch type**:
   - `src/lib/watches/<name>.ts` - Implementation
   - `src/lib/watches/index.ts` - Add to router switch statement
   - `src/lib/configuration/config.ts` - Add to WatchConfig union type
   - Run `npm run generate-schema` to update schema
   - `test/lib/watches/filter-<name>.test.ts` - Add tests
   - `CLAUDE.md` - Update watch table and examples

2. **Adding a new command**:
   - `src/commands/<name>.ts` - Extend `BaseCommand`, implement `run()` returning `JsonOutput | void`
   - Inherit `baseFlags` automatically; add command-specific flags
   - For JSON output, return data from `run()` when `this.jsonEnabled()`
   - Run `npm run prepack` to update README
   - Add tests in `test/commands/<name>.test.ts`

3. **Changing command interface**:
   - `src/commands/**/*.ts` - Update args/flags
   - Run `npm run prepack` to update README
   - Update examples in command description

4. **Modifying configuration schema**:
   - `src/lib/configuration/config.ts` - Update types
   - Run `npm run generate-schema`
   - Update `distill.yml` if needed
   - Update documentation and examples
