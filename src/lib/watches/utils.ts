import {spawn} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {unlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import type {FileVersions} from '../diff/parser.js'
import type {FilterResult} from './types.js'

export interface ExtractedContent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any>[][]
  text: string
}

export type Extractor = (content: null | string) => ExtractedContent | Promise<ExtractedContent>

/**
 * Run a command with stdin input and return stdout.
 */
export function runWithStdin(command: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
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
      if (code === 0) {
        resolve(stdout)
      } else if (stdout) {
        // Some tools (like jq) return non-zero for certain operations
        // but still produce valid output
        resolve(stdout)
      } else {
        reject(new Error(`${command} exited with code ${code}: ${stderr}`))
      }
    })

    proc.on('error', reject)

    proc.stdin.write(input)
    proc.stdin.end()
  })
}

/**
 * Create diff text between two artifacts using temp files.
 */
export async function createDiffText(left: string, right: string): Promise<string> {
  const id = randomBytes(8).toString('hex')
  const leftPath = join(tmpdir(), `distill-left-${id}`)
  const rightPath = join(tmpdir(), `distill-right-${id}`)

  await writeFile(leftPath, left)
  await writeFile(rightPath, right)

  try {
    const result = await new Promise<string>((resolve) => {
      const proc = spawn('diff', ['-u', leftPath, rightPath])
      let stdout = ''

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.on('close', () => {
        // diff returns 1 when files differ, which is expected
        resolve(stdout)
      })

      proc.on('error', () => {
        resolve('')
      })
    })
    return result
  } finally {
    await unlink(leftPath).catch(() => {})
    await unlink(rightPath).catch(() => {})
  }
}

/**
 * Extract the line range from the first hunk header in the diff text.
 * Hunk headers format: @@ -oldStart,oldLines +newStart,newLines @@
 * We are interested in the new range (after the +).
 */
function parseLineRange(diffText: string): undefined | {end: number; start: number} {
  const match = diffText.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/m)
  if (!match) {
    return undefined
  }

  const start = Number.parseInt(match[1], 10)
  const lines = match[2] ? Number.parseInt(match[2], 10) : 1

  return {
    end: start + lines - 1, // inclusive
    start,
  }
}

/**
 * Create a FilterResult from two artifacts.
 * Conditionally parses line numbers from the diff text.
 */
export async function createFilterResult(
  leftArtifact: string,
  rightArtifact: string,
  shouldExtractLineRange = true,
): Promise<FilterResult | null> {
  // If artifacts are the same, no meaningful diff after filtering
  if (leftArtifact === rightArtifact) {
    return null
  }

  const diffText = await createDiffText(leftArtifact, rightArtifact)
  const lineRange = shouldExtractLineRange ? parseLineRange(diffText) : undefined

  return {
    diffText,
    left: {artifact: leftArtifact},
    right: {artifact: rightArtifact},
    ...(lineRange ? {lineRange} : {}),
  }
}

/**
 * Helper to process filter application with common logic for extraction and context merging.
 */
export async function processFilter(versions: FileVersions, extractor: Extractor): Promise<FilterResult | null> {
  if (versions.oldContent === null && versions.newContent === null) {
    return null
  }

  const [left, right] = await Promise.all([
    Promise.resolve(extractor(versions.oldContent)),
    Promise.resolve(extractor(versions.newContent)),
  ])

  // Combine contexts from both sides
  const allContexts = new Set<string>()
  for (const c of left.context) allContexts.add(JSON.stringify(c))
  for (const c of right.context) allContexts.add(JSON.stringify(c))

  const result = await createFilterResult(left.text, right.text)

  if (result && allContexts.size > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.context = [...allContexts].map((c) => JSON.parse(c) as any)
  }

  return result
}
