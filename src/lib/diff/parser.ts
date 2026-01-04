import {execFile} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)

// Type definitions for gitdiff-parser (the package's types are broken for ESM)
export type ChangeType = 'delete' | 'insert' | 'normal'

export interface InsertChange {
  content: string
  isInsert: true
  lineNumber: number
  type: 'insert'
}

export interface DeleteChange {
  content: string
  isDelete: true
  lineNumber: number
  type: 'delete'
}

export interface NormalChange {
  content: string
  isNormal: true
  newLineNumber: number
  oldLineNumber: number
  type: 'normal'
}

export type Change = DeleteChange | InsertChange | NormalChange

export interface Hunk {
  changes: Change[]
  content: string
  newLines: number
  newStart: number
  oldLines: number
  oldStart: number
}

export type FileType = 'add' | 'copy' | 'delete' | 'modify' | 'rename'

export interface File {
  hunks: Hunk[]
  isBinary?: boolean
  newEndingNewLine: boolean
  newMode: string
  newPath: string
  newRevision: string
  oldEndingNewLine: boolean
  oldMode: string
  oldPath: string
  oldRevision: string
  similarity?: number
  type: FileType
}

// Import the parser - need to use createRequire for CommonJS module with broken ESM types
import {createRequire} from 'node:module'
const require = createRequire(import.meta.url)
const gitDiffParser = require('gitdiff-parser') as {parse: (source: string) => File[]}

export interface ParsedDiff {
  files: File[]
}

export function parseDiff(diffText: string): ParsedDiff {
  const files = gitDiffParser.parse(diffText) as File[]
  return {files}
}

export interface FileVersions {
  newContent: null | string
  oldContent: null | string
}

/**
 * Get file content at a specific commit reference.
 * Use "." or empty string to read from working directory.
 */
async function getFileAtRef(ref: string, path: string, cwd: string): Promise<null | string> {
  // "." means working directory
  if (ref === '.' || ref === '') {
    try {
      return await readFile(join(cwd, path), 'utf8')
    } catch {
      return null
    }
  }

  // Otherwise use git show with the commit reference
  try {
    const {stdout} = await execFileAsync('git', ['show', `${ref}:${path}`], {cwd})
    return stdout
  } catch {
    return null
  }
}

export interface RefPair {
  base: string
  head: string
}

/**
 * Get the old and new content of a file using the base and head commit references.
 * Returns null for content if the file was added (no old) or deleted (no new).
 */
export async function getFileVersions(file: File, refs: RefPair, cwd: string): Promise<FileVersions> {
  let oldContent: null | string = null
  let newContent: null | string = null

  // Get old content if file existed before (not an add)
  if (file.type !== 'add') {
    oldContent = await getFileAtRef(refs.base, file.oldPath, cwd)
  }

  // Get new content if file exists after (not a delete)
  if (file.type !== 'delete') {
    newContent = await getFileAtRef(refs.head, file.newPath, cwd)
  }

  return {newContent, oldContent}
}
