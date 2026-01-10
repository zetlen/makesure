import {expect} from 'chai'

import {FilterResult} from '../../../src/lib/configuration/config.js'
import {executeReport, HandlebarsReport} from '../../../src/lib/reports/index.js'

describe('Reports', () => {
  describe('executeReport', () => {
    it('populates metadata correctly', () => {
      const report: HandlebarsReport = {
        template: 'Found issue in {{filePath}}',
        type: 'handlebars',
      }

      const filterResult: FilterResult = {
        diffText: 'some diff',
        left: {artifact: 'left'},
        right: {artifact: 'right'},
      }

      const context = {filePath: 'src/main.ts'}

      const output = executeReport(report, filterResult, context)

      expect(output.content).to.equal('Found issue in src/main.ts')
      expect(output.metadata).to.deep.include({
        diffText: 'some diff',
        fileName: 'src/main.ts',
        message: 'Found issue in src/main.ts',
      })
    })

    it('extracts line range from diff', () => {
      const report: HandlebarsReport = {
        template: 'Issue',
        type: 'handlebars',
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

      const output = executeReport(report, filterResult, context)

      expect(output.metadata?.lineRange).to.deep.equal({
        end: 24,
        start: 20,
      })
    })
  })
})
