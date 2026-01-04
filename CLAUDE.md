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

# Main usage: pipe a git diff to diff:annotate
git diff HEAD | ./bin/run.js diff:annotate
git diff main...feature | ./bin/run.js diff:annotate --config ./custom-rules.yml
```

## Architecture

### Configuration System

The core of makesure is a rule-based configuration system defined in `src/lib/configuration/config.ts`:

- **FileRuleset**: Maps file patterns (globs) to rules
- **Rule**: Contains filters and actions to apply to matching files
- **Filter**: Processes files before diffing (e.g., `jq` for JSON, `yq` for YAML)
  - Filters run on both sides of a diff to produce artifacts A and B
  - Returns a `FilterResult` containing the diff text and both artifacts
- **Action**: What to do when a rule triggers
  - **ReportAction**: Generates text reports using Handlebars templates with markdown support
  - **RunAction**: Executes arbitrary commands with environment variables from the filter results

Configuration is stored in `makesure.yml` at the project root, with JSON schema validation available via `makesure-schema.json`.

### Project Structure

- `src/index.ts`: Re-exports oclif's run function (standard oclif entry point)
- `src/commands/`: Command implementations
  - `diff/annotate.ts`: Main command that reads diff from stdin and applies rules
- `src/lib/`: Core library modules
  - `configuration/`: Config types and YAML loader
  - `diff/`: Git diff parsing and file version retrieval
  - `filters/`: Filter implementations (jq)
  - `actions/`: Action implementations (report with Handlebars)
- `test/`: Mocha/Chai tests using `@oclif/test`
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
- Tests follow the pattern: `test/commands/**/*.test.ts` mirrors `src/commands/**/*.ts`
- Run with `--forbid-only` to prevent committed `.only()` calls
