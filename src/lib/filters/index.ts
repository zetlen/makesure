import {spawn} from 'node:child_process'

import type {FileVersions} from '../diff/parser.js'

export interface FilterResult {
  diffText: string
  left: {
    artifact: string
  }
  right: {
    artifact: string
  }
}

export interface Filter {
  args: string[]
  type: string
}

/**
 * Run a command with stdin input and return stdout.
 */
function runWithStdin(command: string, args: string[], input: string): Promise<string> {
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
 * Run jq with the given args on the input content.
 */
async function runJq(content: string, args: string[]): Promise<string> {
  return runWithStdin('jq', args, content)
}

/**
 * Create diff text between two artifacts using temp files.
 */
async function createDiffText(left: string, right: string): Promise<string> {
  const {unlink, writeFile} = await import('node:fs/promises')
  const {tmpdir} = await import('node:os')
  const {join} = await import('node:path')
  const {randomBytes} = await import('node:crypto')

  const id = randomBytes(8).toString('hex')
  const leftPath = join(tmpdir(), `makesure-left-${id}`)
  const rightPath = join(tmpdir(), `makesure-right-${id}`)

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
 * Apply a jq filter to file versions and return the filter result.
 */
export async function applyJqFilter(
  versions: FileVersions,
  args: string[],
): Promise<FilterResult | null> {
  // If both are null, nothing to filter
  if (versions.oldContent === null && versions.newContent === null) {
    return null
  }

  const leftArtifact = versions.oldContent ? await runJq(versions.oldContent, args) : ''
  const rightArtifact = versions.newContent ? await runJq(versions.newContent, args) : ''

  // If artifacts are the same, no meaningful diff after filtering
  if (leftArtifact === rightArtifact) {
    return null
  }

  const diffText = await createDiffText(leftArtifact, rightArtifact)

  return {
    diffText,
    left: {artifact: leftArtifact},
    right: {artifact: rightArtifact},
  }
}

/**
 * Apply a filter to file versions based on filter type.
 */
export async function applyFilter(
  filter: Filter,
  versions: FileVersions,
): Promise<FilterResult | null> {
  switch (filter.type) {
    case 'jq': {
      return applyJqFilter(versions, filter.args)
    }

    default: {
      throw new Error(`Unsupported filter type: ${filter.type}`)
    }
  }
}
