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
$ npm install -g distill
$ distill COMMAND
running command...
$ distill (--version)
distill/0.0.0 darwin-arm64 node-v25.2.1
$ distill --help [COMMAND]
USAGE
  $ distill COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`distill diff annotate BASE HEAD`](#distill-diff-annotate-base-head)
- [`distill help [COMMAND]`](#distill-help-command)

## `distill diff annotate BASE HEAD`

Annotate a git diff with semantic analysis based on configured rules

```
USAGE
  $ distill diff annotate BASE HEAD [-c <value>] [-r <value>]

ARGUMENTS
  BASE  Base commit-ish (e.g., HEAD~1, main, a1b2c3d)
  HEAD  Head commit-ish (e.g., HEAD, feat/foo, . for working directory)

FLAGS
  -c, --config=<value>  Path to the distill configuration file (default: distill.yml in repo root)
  -r, --repo=<value>    Path to the git repository (default: toplevel of current directory)

DESCRIPTION
  Annotate a git diff with semantic analysis based on configured rules

EXAMPLES
  $ distill diff annotate HEAD~1 HEAD

  $ distill diff annotate main feat/foo

  $ distill diff annotate HEAD . # compare HEAD to working directory

  $ distill diff annotate main HEAD --repo ../other-project
```

_See code: [src/commands/diff/annotate.ts](https://github.com/zetlen/distill/blob/v0.0.0/src/commands/diff/annotate.ts)_

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
