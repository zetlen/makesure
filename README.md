# distill

Process code changes with semantic rules

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/distill.svg)](https://npmjs.org/package/distill)
[![Downloads/week](https://img.shields.io/npm/dw/distill.svg)](https://npmjs.org/package/distill)

<!-- toc -->
* [distill](#distill)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @distill/cli
$ distill COMMAND
running command...
$ distill (--version)
@distill/cli/1.0.2 darwin-arm64 node-v24.12.0
$ distill --help [COMMAND]
USAGE
  $ distill COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`distill annotate diff BASE HEAD`](#distill-annotate-diff-base-head)
* [`distill annotate pr PR`](#distill-annotate-pr-pr)
* [`distill help [COMMAND]`](#distill-help-command)

## `distill annotate diff BASE HEAD`

Annotate a git diff with semantic analysis based on configured rules.

```
USAGE
  $ distill annotate diff BASE HEAD [-c <value>] [--json] [-r <value>]

ARGUMENTS
  BASE  Base commit-ish (e.g., HEAD~1, main, a1b2c3d)
  HEAD  Head commit-ish (e.g., HEAD, feat/foo, . for working directory)

FLAGS
  -c, --config=<value>  Path to the distill configuration file (default: distill.yml in repo root)
  -r, --repo=<value>    Path to git repository
      --json            Output reports in JSON format. Note: "lineRange" in metadata is relative to the filtered
                        artifact, not necessarily the original source file. For some filters (like jq/xpath), exact
                        source line mapping may be approximate.

DESCRIPTION
  Annotate a git diff with semantic analysis based on configured rules.

  When using --json, a "lineRange" field is included. Note that this range refers to the line numbers within the
  *filtered artifact* (the code snippet shown in the report), NOT the original source file.

  Future versions may map these back to original source lines for supported filters (ast-grep, tsq, xpath).

EXAMPLES
  $ distill annotate diff HEAD~1 HEAD

  $ distill annotate diff main feat/foo

  $ distill annotate diff HEAD . # compare HEAD to working directory

  $ distill annotate diff main HEAD --repo ../other-project
```

_See code: [src/commands/annotate/diff.ts](https://github.com/zetlen/distill/blob/v1.0.2/src/commands/annotate/diff.ts)_

## `distill annotate pr PR`

Annotate a GitHub Pull Request

```
USAGE
  $ distill annotate pr PR [-c <value>] [--json] [-r <value>]

ARGUMENTS
  PR  PR number or URL

FLAGS
  -c, --config=<value>  Path to the distill configuration file (default: distill.yml in repo root)
  -r, --repo=<value>    GitHub repository (owner/repo). Required if not running in a git repo.
      --json            Output reports in JSON format

DESCRIPTION
  Annotate a GitHub Pull Request
```

_See code: [src/commands/annotate/pr.ts](https://github.com/zetlen/distill/blob/v1.0.2/src/commands/annotate/pr.ts)_

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
<!-- commandsstop -->
