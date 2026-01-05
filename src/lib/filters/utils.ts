import {spawn} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {unlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

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
