import {readFile} from 'node:fs/promises'
import {parse as parseYaml} from 'yaml'

import type {MakesureConfig} from './config.js'

export async function loadConfig(path: string): Promise<MakesureConfig> {
  const content = await readFile(path, 'utf8')
  return parseYaml(content) as MakesureConfig
}
