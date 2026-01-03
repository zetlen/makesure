makesure
=================

Process code changes with semantic rules


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/makesure.svg)](https://npmjs.org/package/makesure)
[![Downloads/week](https://img.shields.io/npm/dw/makesure.svg)](https://npmjs.org/package/makesure)


<!-- toc -->
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
* [`makesure hello PERSON`](#makesure-hello-person)
* [`makesure hello world`](#makesure-hello-world)
* [`makesure help [COMMAND]`](#makesure-help-command)
* [`makesure plugins`](#makesure-plugins)
* [`makesure plugins add PLUGIN`](#makesure-plugins-add-plugin)
* [`makesure plugins:inspect PLUGIN...`](#makesure-pluginsinspect-plugin)
* [`makesure plugins install PLUGIN`](#makesure-plugins-install-plugin)
* [`makesure plugins link PATH`](#makesure-plugins-link-path)
* [`makesure plugins remove [PLUGIN]`](#makesure-plugins-remove-plugin)
* [`makesure plugins reset`](#makesure-plugins-reset)
* [`makesure plugins uninstall [PLUGIN]`](#makesure-plugins-uninstall-plugin)
* [`makesure plugins unlink [PLUGIN]`](#makesure-plugins-unlink-plugin)
* [`makesure plugins update`](#makesure-plugins-update)

## `makesure hello PERSON`

Say hello

```
USAGE
  $ makesure hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ makesure hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/zetlen/makesure/blob/v0.0.0/src/commands/hello/index.ts)_

## `makesure hello world`

Say hello world

```
USAGE
  $ makesure hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ makesure hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/zetlen/makesure/blob/v0.0.0/src/commands/hello/world.ts)_

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

## `makesure plugins`

List installed plugins.

```
USAGE
  $ makesure plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ makesure plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/index.ts)_

## `makesure plugins add PLUGIN`

Installs a plugin into makesure.

```
USAGE
  $ makesure plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into makesure.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the MAKESURE_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MAKESURE_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ makesure plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ makesure plugins add myplugin

  Install a plugin from a github url.

    $ makesure plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ makesure plugins add someuser/someplugin
```

## `makesure plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ makesure plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ makesure plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/inspect.ts)_

## `makesure plugins install PLUGIN`

Installs a plugin into makesure.

```
USAGE
  $ makesure plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into makesure.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the MAKESURE_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MAKESURE_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ makesure plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ makesure plugins install myplugin

  Install a plugin from a github url.

    $ makesure plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ makesure plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/install.ts)_

## `makesure plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ makesure plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ makesure plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/link.ts)_

## `makesure plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ makesure plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ makesure plugins unlink
  $ makesure plugins remove

EXAMPLES
  $ makesure plugins remove myplugin
```

## `makesure plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ makesure plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/reset.ts)_

## `makesure plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ makesure plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ makesure plugins unlink
  $ makesure plugins remove

EXAMPLES
  $ makesure plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/uninstall.ts)_

## `makesure plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ makesure plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ makesure plugins unlink
  $ makesure plugins remove

EXAMPLES
  $ makesure plugins unlink myplugin
```

## `makesure plugins update`

Update installed plugins.

```
USAGE
  $ makesure plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/update.ts)_
<!-- commandsstop -->
