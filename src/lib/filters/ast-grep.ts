import {spawn} from 'node:child_process'

import type {FileVersions} from '../diff/parser.js'
import type {FilterApplier, FilterResult} from './types.js'

import {processFilter} from './utils.js'

/**
 * Pattern object for ast-grep with context and selector.
 * Used for precise matching within specific AST structures.
 *
 * @example
 * ```yaml
 * pattern:
 *   context: 'class C { static override args = $ARGS }'
 *   selector: public_field_definition
 * ```
 */
export interface AstGrepPatternObject {
  /**
   * Full code snippet providing context for parsing.
   * This helps ast-grep understand the syntactic structure.
   */
  context: string
  /**
   * AST node type to select from the matched context.
   * Ensures precise targeting of specific syntax elements.
   */
  selector: string
}

/**
 * Configuration for the ast-grep filter.
 * Extracts AST nodes from source code using ast-grep's pattern syntax.
 * Patterns look like actual code with metavariables ($VAR) for wildcards.
 *
 * @example
 * ```yaml
 * # Find all console.log calls
 * filters:
 *   - type: ast-grep
 *     pattern: "console.log($$$ARGS)"
 *     language: javascript
 * ```
 *
 * @example
 * ```yaml
 * # Find function declarations (language inferred from file extension)
 * filters:
 *   - type: ast-grep
 *     pattern: "function $NAME($$$PARAMS) { $$$BODY }"
 * ```
 *
 * @example
 * ```yaml
 * # Find Python class definitions
 * filters:
 *   - type: ast-grep
 *     pattern: "class $NAME:"
 *     language: python
 * ```
 *
 * @example
 * ```yaml
 * # Find specific field in class with context and selector
 * filters:
 *   - type: ast-grep
 *     language: typescript
 *     pattern:
 *       context: 'class C { static override args = $ARGS }'
 *       selector: public_field_definition
 * ```
 */
export type AstGrepFilterConfig = {
  /**
   * The language to parse the code as.
   * Required for accurate AST parsing.
   */
  language: string
  /**
   * The pattern to match against. Can be a simple string pattern
   * or an object with context and selector for precise matching.
   */
  pattern: AstGrepPatternObject | string
  /**
   * Discriminant tag identifying this as an ast-grep filter.
   */
  type: 'ast-grep'
}

/**
 * Run ast-grep command with stdin input and return stdout.
 */
function runAstGrep(args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ast-grep', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      // ast-grep run returns 0 for no matches, 1 for matches found
      // ast-grep scan returns 0 for success, 1 for matches (when used as linter)
      // We accept both as valid responses as long as we have output or no errors
      if (code === 0 || code === 1 || stdout) {
        resolve(stdout)
      } else {
        reject(new Error(`ast-grep exited with code ${code}: ${stderr}`))
      }
    })

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('ast-grep command not found. Please install it: npm install -g @ast-grep/cli'))
      } else {
        reject(err)
      }
    })

    proc.stdin.write(input)
    proc.stdin.end()
  })
}

/**
 * Build inline rule YAML for ast-grep scan command.
 * Used for pattern objects with context and selector.
 */
function buildInlineRule(language: string, pattern: AstGrepPatternObject): string {
  return `id: distill-filter
language: ${language}
rule:
  pattern:
    context: "${pattern.context}"
    selector: ${pattern.selector}
`
}

/**
 * Extract matched text from ast-grep JSON output.
 */
interface AstGrepMatch {
  metaVariables?: {
    multi?: Record<string, {text: string}>
    single?: Record<string, {text: string}>
    transformed?: Record<string, {text: string}>
  }
  text: string
}

/**
 * Extract matched text and context from ast-grep JSON output.
 */
function extractMatchedText(jsonOutput: string): {context: Record<string, string>[][]; text: string} {
  if (!jsonOutput.trim()) {
    return {context: [], text: ''}
  }

  try {
    const matches = JSON.parse(jsonOutput) as AstGrepMatch[]
    const text = matches.map((m) => m.text).join('\n\n')

    // Extract meta-variables as context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contexts: Record<string, any>[] = []

    for (const match of matches) {
      if (match.metaVariables) {
        const context: Record<string, string> = {}

        // Helper to merge variables

        const extractVars = (vars?: Record<string, {text: string}>) => {
          if (!vars) return
          for (const [key, value] of Object.entries(vars)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            context[key] = (value as any).text
          }
        }

        extractVars(match.metaVariables.single)
        extractVars(match.metaVariables.multi)
        extractVars(match.metaVariables.transformed)

        if (Object.keys(context).length > 0) {
          contexts.push(context)
        }
      }
    }

    return {
      context: [contexts],
      text,
    }
  } catch {
    // If parsing fails, return empty
    return {context: [], text: ''}
  }
}

/**
 * ast-grep filter for extracting AST nodes using pattern matching.
 * Uses the ast-grep CLI tool to parse and search code.
 */
export const astGrepFilter: FilterApplier<AstGrepFilterConfig> = {
  async apply(versions: FileVersions, config: AstGrepFilterConfig): Promise<FilterResult | null> {
    const {language, pattern} = config

    // Determine language
    if (!language) {
      throw new Error('ast-grep filter requires a language to be specified')
    }

    const extractNodes = async (
      content: null | string,
    ): Promise<{context: Record<string, string>[][]; text: string}> => {
      if (!content) return {context: [], text: ''}

      let args: string[]

      if (typeof pattern === 'string') {
        // Simple string pattern - use the simpler "run" command
        args = ['run', '-p', pattern, '--lang', language, '--json', '--stdin']
      } else {
        // Pattern object with context/selector - use "scan" with inline rules
        const inlineRule = buildInlineRule(language, pattern)
        args = ['scan', '--inline-rules', inlineRule, '--json', '--stdin']
      }

      const jsonOutput = await runAstGrep(args, content)
      return extractMatchedText(jsonOutput)
    }

    return processFilter(versions, extractNodes)
  },
}
