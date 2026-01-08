# distill

Process code changes with semantic rules

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/distill.svg)](https://npmjs.org/package/distill)
[![Downloads/week](https://img.shields.io/npm/dw/distill.svg)](https://npmjs.org/package/distill)

<!-- toc -->

- [distill](#distill)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @distill/cli
$ distill COMMAND
running command...
$ distill (--version)
@distill/cli/1.1.0 darwin-arm64 node-v24.12.0
$ distill --help [COMMAND]
USAGE
  $ distill COMMAND
...
```

<!-- usagestop -->

# Configuration

`distill` is configured via a `distill.yml` file in your repository root. You can define "checksets" to apply rules to specific files, and optionally group them by "concerns" to notify relevant "stakeholders".

## Concerns and Stakeholders

You can define high-level **concerns** (e.g., "security", "ui-consistency") and map them to **stakeholders** (teams or individuals). Checksets can then be attached to these concerns.

```yaml
concerns:
  security:
    stakeholders:
      - name: Security Team
        contactMethod: github-reviewer-request
        description: Reviews security-sensitive changes
  ui-consistency:
    stakeholders:
      - name: Design System Team
        contactMethod: github-comment-mention

checksets:
  - include: 'src/auth/**/*.ts'
    concerns: ['security']
    checks:
      - filters:
          - type: regex
            pattern: 'password|secret'
        actions:
          - template: 'Potential secret exposure in {{filePath}}'
            urgency: 10
          # Update the shared context for this concern
          - set:
              hasSecrets: 'true'

  - include: 'src/components/**/*.tsx'
    concerns: ['ui-consistency']
    checks:
      - filters:
          - type: ast-grep
            language: tsx
            pattern:
              context: 'style={{...}}'
              selector: 'jsx_attribute'
        actions:
          - template: 'Avoid inline styles in {{filePath}}. Use standard classes.'
            urgency: 5
```

# Commands

<!-- commands -->

- [`distill diff [BASE] [HEAD]`](#distill-diff-base-head)
- [`distill help [COMMAND]`](#distill-help-command)
- [`distill pr [PR]`](#distill-pr-pr)

## `distill diff [BASE] [HEAD]`

Annotate a git diff with semantic analysis based on configured rules.

```
USAGE
  $ distill diff [BASE] [HEAD] [--json] [-c <value>] [-r <value>] [-s]

ARGUMENTS
  [BASE]  Base commit-ish (e.g., HEAD~1, main). Defaults based on working tree state.
  [HEAD]  Head commit-ish (e.g., HEAD, feat/foo, . for working directory). Defaults to "."

FLAGS
  -c, --config=<value>  Path to the distill configuration file (default: distill.yml in repo root)
  -r, --repo=<value>    Path to git repository
  -s, --staged          Only check staged changes (when comparing with working directory)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Annotate a git diff with semantic analysis based on configured rules.

  When no arguments are provided, defaults are chosen based on the working tree state:
  - If there are unstaged changes, compares HEAD to the working directory
  - If there are only staged changes, use --staged to check them

  When using --json, a "lineRange" field is included. Note that this range refers to the line numbers within the
  *filtered artifact* (the code snippet shown in the report), NOT the original source file.

EXAMPLES
  $ distill diff                  # auto-detect changes

  $ distill diff --staged         # check staged changes only

  $ distill diff HEAD~1 HEAD

  $ distill diff main feat/foo

  $ distill diff HEAD .           # compare HEAD to working directory

  $ distill diff main HEAD --repo ../other-project
```

_See code: [src/commands/diff.ts](https://github.com/zetlen/distill/blob/v1.1.0/src/commands/diff.ts)_

## `distill help [COMMAND]`

Display help for distill.

```
USAGE
  $ distill help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for distill.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_

## `distill pr [PR]`

Annotate a GitHub Pull Request.

```
USAGE
  $ distill pr [PR] [--json] [-c <value>] [-r <value>]

ARGUMENTS
  [PR]  PR number or URL (optional: detects PR for current branch if omitted)

FLAGS
  -c, --config=<value>  Path to the distill configuration file (default: distill.yml in repo root)
  -r, --repo=<value>    GitHub repository (owner/repo). Required if not running in a git repo.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Annotate a GitHub Pull Request.

  When no argument is provided, detects the PR associated with the current branch.
  Requires GITHUB_TOKEN environment variable for authentication.

EXAMPLES
  $ distill pr                                # auto-detect PR for current branch

  $ distill pr 123                            # PR number (uses detected remote)

  $ distill pr https://github.com/owner/repo/pull/123

  $ distill pr 123 --repo owner/repo
```

_See code: [src/commands/pr.ts](https://github.com/zetlen/distill/blob/v1.1.0/src/commands/pr.ts)_

<!-- commandsstop -->
