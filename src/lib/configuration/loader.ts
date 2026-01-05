import {readFile} from 'node:fs/promises'
import {parse as parseYaml} from 'yaml'

import type {DistillConfig} from './config.js'

export async function loadConfig(path: string): Promise<DistillConfig> {
  const content = await readFile(path, 'utf8')
  return parseYaml(content) as DistillConfig
}
