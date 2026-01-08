import {expect} from 'chai'

import {DistillConfig} from '../../../src/lib/configuration/config.js'
import {File} from '../../../src/lib/diff/parser.js'
import {processFiles} from '../../../src/lib/processing/runner.js'
import {ProcessingContext} from '../../../src/lib/processing/types.js'

describe('Concerns Processing', () => {
  it('updates concern context when action triggers', async () => {
    const config: DistillConfig = {
      checksets: [
        {
          checks: [
            {
              actions: [
                {
                  set: {
                    foundFoo: 'true',
                  },
                },
              ],
              filters: [
                {
                  pattern: 'foo',
                  type: 'regex',
                },
              ],
            },
          ],
          concerns: ['my-concern'],
          include: '*.ts',
        },
      ],
      concerns: {
        'my-concern': {
          stakeholders: [
            {
              contactMethod: 'email',
              name: 'Team A',
            },
          ],
        },
      },
    }

    const context: ProcessingContext = {
      concerns: {},
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

    await processFiles(files, config, context)

    expect(context.concerns['my-concern']).to.deep.equal({foundFoo: 'true'})
  })
})
