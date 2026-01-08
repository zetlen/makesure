import {expect} from 'chai'

import {
  executeReportAction,
  executeUpdateConcernContextAction,
  ReportAction,
  UpdateConcernContextAction,
} from '../../../src/lib/actions/index.js'
import {FilterResult} from '../../../src/lib/filters/types.js'

describe('Actions', () => {
  describe('executeReportAction', () => {
    it('populates metadata correctly', () => {
      const action: ReportAction = {
        template: 'Found issue in {{filePath}}',
        urgency: 1,
      }

      const filterResult: FilterResult = {
        diffText: 'some diff',
        left: {artifact: 'left'},
        right: {artifact: 'right'},
      }

      const context = {filePath: 'src/main.ts'}

      const output = executeReportAction(action, filterResult, context)

      expect(output.content).to.equal('Found issue in src/main.ts')
      expect(output.urgency).to.equal(1)
      expect(output.metadata).to.deep.include({
        diffText: 'some diff',
        fileName: 'src/main.ts',
        message: 'Found issue in src/main.ts',
      })
    })

    it('extracts line range from diff', () => {
      const action: ReportAction = {
        template: 'Issue',
        urgency: 1,
      }

      const diffText = `--- a.ts
+++ b.ts
@@ -10,1 +20,5 @@
 context
+new line
 context`

      const filterResult: FilterResult = {
        diffText,
        left: {artifact: 'left'},
        lineRange: {end: 24, start: 20},
        right: {artifact: 'right'},
      }

      const context = {filePath: 'src/main.ts'}

      const output = executeReportAction(action, filterResult, context)

      expect(output.metadata?.lineRange).to.deep.equal({
        end: 24,
        start: 20,
      })
    })
  })

  describe('executeUpdateConcernContextAction', () => {
    it('evaluates templates in values', () => {
      const action: UpdateConcernContextAction = {
        set: {
          flag: 'true',
          message: 'Found {{filePath}}',
        },
      }

      const filterResult: FilterResult = {
        diffText: 'diff',
        left: {artifact: 'left'},
        right: {artifact: 'right'},
      }

      const context = {filePath: 'src/config.ts'}

      const updates = executeUpdateConcernContextAction(action, filterResult, context)

      expect(updates).to.deep.equal({
        flag: 'true',
        message: 'Found src/config.ts',
      })
    })
  })
})
