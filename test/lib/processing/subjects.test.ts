import {expect} from 'chai'

import {TiltshiftConfig} from '../../../src/lib/configuration/config.js'
import {File} from '../../../src/lib/diff/parser.js'
import {processFiles} from '../../../src/lib/processing/runner.js'
import {ProcessingContext} from '../../../src/lib/processing/types.js'

describe('Subjects Processing', () => {
  it('updates subject context when viewer triggers', async () => {
    const config: TiltshiftConfig = {
      subjects: {
        'my-subject': {
          projections: [
            {
              focuses: [
                {
                  pattern: 'foo',
                  type: 'regex',
                },
              ],
              include: '*.ts',
              viewers: [
                {
                  set: {
                    foundFoo: 'true',
                  },
                },
              ],
            },
          ],
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
      contentProvider: async (ref) => (ref === 'HEAD' ? 'foo' : ''),
      refs: {base: 'BASE', head: 'HEAD'},
      subjects: {},
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

    expect(context.subjects['my-subject']).to.deep.equal({foundFoo: 'true'})
  })
})
