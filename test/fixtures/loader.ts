import {readFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import type {FileVersions} from '../../src/lib/diff/parser.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Load a fixture file from the fixtures directory.
 * @param relativePath - Path relative to the fixtures directory
 * @returns The file contents as a string
 */
export async function loadFixture(relativePath: string): Promise<string> {
  const fullPath = join(__dirname, relativePath)
  return readFile(fullPath, 'utf8')
}

/**
 * Load a pair of fixture files representing old and new versions.
 * @param dir - Directory containing the fixtures (relative to fixtures dir)
 * @param oldFile - Filename for the old version
 * @param newFile - Filename for the new version
 * @returns FileVersions object with oldContent and newContent
 */
export async function loadVersions(
  dir: string,
  oldFile: string,
  newFile: string,
): Promise<FileVersions> {
  const [oldContent, newContent] = await Promise.all([
    loadFixture(join(dir, oldFile)),
    loadFixture(join(dir, newFile)),
  ])
  return {newContent, oldContent}
}

/**
 * Load filter-specific fixture versions.
 * Convenience function for common fixture patterns.
 */
export const fixtures = {
  // ast-grep reuses tsq fixtures since they work for both tools
  astGrep: {
    go: () => loadVersions('filters/tsq/go', 'handlers-v1.go', 'handlers-v2.go'),
    java: () => loadVersions('filters/tsq/java', 'UserService-v1.java', 'UserService-v2.java'),
    javascript: () => loadVersions('filters/tsq/javascript', 'utils-v1.js', 'utils-v2.js'),
    python: () => loadVersions('filters/tsq/python', 'models-v1.py', 'models-v2.py'),
    rust: () => loadVersions('filters/tsq/rust', 'lib-v1.rs', 'lib-v2.rs'),
    typescript: () => loadVersions('filters/tsq/typescript', 'types-v1.ts', 'types-v2.ts'),
  },
  jq: {
    package: () => loadVersions('filters/jq', 'package-v1.json', 'package-v2.json'),
  },
  regex: {
    config: () => loadVersions('filters/regex', 'config-v1.env', 'config-v2.env'),
  },
  tsq: {
    go: () => loadVersions('filters/tsq/go', 'handlers-v1.go', 'handlers-v2.go'),
    java: () => loadVersions('filters/tsq/java', 'UserService-v1.java', 'UserService-v2.java'),
    javascript: () => loadVersions('filters/tsq/javascript', 'utils-v1.js', 'utils-v2.js'),
    json: () => loadVersions('filters/tsq/json', 'config-v1.json', 'config-v2.json'),
    python: () => loadVersions('filters/tsq/python', 'models-v1.py', 'models-v2.py'),
    rust: () => loadVersions('filters/tsq/rust', 'lib-v1.rs', 'lib-v2.rs'),
    typescript: () => loadVersions('filters/tsq/typescript', 'types-v1.ts', 'types-v2.ts'),
  },
  xpath: {
    pom: () => loadVersions('filters/xpath', 'pom-v1.xml', 'pom-v2.xml'),
  },
}
