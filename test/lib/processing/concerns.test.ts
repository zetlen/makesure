import {expect} from 'chai'

import {DistillConfig} from '../../../src/lib/configuration/config.js'
import {File} from '../../../src/lib/diff/parser.js'
import {processFiles} from '../../../src/lib/processing/runner.js'
import {ProcessingContext} from '../../../src/lib/processing/types.js'

describe('Concerns Processing', () => {
  it('generates a report when a signal is triggered', async () => {
    const config: DistillConfig = {
      concerns: {
        'my-concern': {
          signals: [
            {
              report: {
                template: 'Found foo',
                type: 'handlebars',
              },
              watch: {
                include: '*.ts',
                pattern: 'foo',
                type: 'regex',
              },
            },
          ],
        },
      },
    }

    const context: ProcessingContext = {
      contentProvider: async (ref) => (ref === 'HEAD' ? 'foo' : ''),
      refs: {base: 'BASE', head: 'HEAD'},
    }

    const files: File[] = [
      {
        hunks: [],
        newEndingNewLine: true,
        newMode: '100644',
        newPath: 'test.ts',
        newRevision: 'def',
        oldEndingNewLine: true,
        oldMode: '100644',
        oldPath: 'test.ts',
        oldRevision: 'abc',
        type: 'modify',
      },
    ]

    const result = await processFiles(files, config, context)

    expect(result.reports).to.have.length(1)
    expect(result.reports[0].content).to.include('Found foo')
  })
})
