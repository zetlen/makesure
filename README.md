# makesure

Process code changes with semantic rules

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/makesure.svg)](https://npmjs.org/package/makesure)
[![Downloads/week](https://img.shields.io/npm/dw/makesure.svg)](https://npmjs.org/package/makesure)

<!-- toc -->
* [makesure](#makesure)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g makesure
$ makesure COMMAND
running command...
$ makesure (--version)
makesure/0.0.0 darwin-arm64 node-v25.2.1
$ makesure --help [COMMAND]
USAGE
  $ makesure COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`makesure diff annotate BASE HEAD`](#makesure-diff-annotate-base-head)
* [`makesure help [COMMAND]`](#makesure-help-command)

## `makesure diff annotate BASE HEAD`

Annotate a git diff with semantic analysis based on configured rules

```
USAGE
  $ makesure diff annotate BASE HEAD [-c <value>] [-r <value>]

ARGUMENTS
  BASE  Base commit-ish (e.g., HEAD~1, main, a1b2c3d)
  HEAD  Head commit-ish (e.g., HEAD, feat/foo, . for working directory)

FLAGS
  -c, --config=<value>  Path to the makesure configuration file (default: makesure.yml in repo root)
  -r, --repo=<value>    Path to the git repository (default: toplevel of current directory)

DESCRIPTION
  Annotate a git diff with semantic analysis based on configured rules

EXAMPLES
  $ makesure diff annotate HEAD~1 HEAD

  $ makesure diff annotate main feat/foo

  $ makesure diff annotate HEAD . # compare HEAD to working directory

  $ makesure diff annotate main HEAD --repo ../other-project
```

_See code: [src/commands/diff/annotate.ts](https://github.com/zetlen/makesure/blob/v0.0.0/src/commands/diff/annotate.ts)_

## `makesure help [COMMAND]`

Display help for makesure.

```
USAGE
  $ makesure help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for makesure.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_
<!-- commandsstop -->
