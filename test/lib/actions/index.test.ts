import {expect} from 'chai'

import {executeReportAction, ReportAction} from '../../../src/lib/actions/index.js'
import {FilterResult} from '../../../src/lib/filters/types.js'

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
      right: {artifact: 'right'},
    }

    const context = {filePath: 'src/main.ts'}

    const output = executeReportAction(action, filterResult, context)

    expect(output.metadata?.lineRange).to.deep.equal({
      end: 24, // 20 + 5 - 1
      start: 20,
    })
  })
})
