import {expect} from 'chai'

import {executeReportAction, isReportAction} from '../../../src/lib/actions/index.js'

describe('actions', () => {
  describe('isReportAction', () => {
    it('returns true for report actions', () => {
      const action = {template: 'test', urgency: 1}
      expect(isReportAction(action)).to.be.true
    })

    it('returns false for non-report actions', () => {
      expect(isReportAction({command: 'echo'})).to.be.false
      expect(isReportAction(null)).to.be.false
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(isReportAction(undefined)).to.be.false
      expect(isReportAction('string')).to.be.false
    })
  })

  describe('executeReportAction', () => {
    it('renders a simple template', () => {
      const action = {
        template: 'File changed: {{filePath}}',
        urgency: 1,
      }
      const filterResult = {
        diffText: '- old\n+ new',
        left: {artifact: 'old'},
        right: {artifact: 'new'},
      }

      const result = executeReportAction(action, filterResult, {filePath: 'test.json'})

      expect(result.urgency).to.equal(1)
      expect(result.content).to.equal('File changed: test.json')
    })

    it('renders template with diffText', () => {
      const action = {
        template: '```diff\n{{diffText}}\n```',
        urgency: 2,
      }
      const filterResult = {
        diffText: '- old line\n+ new line',
        left: {artifact: 'old line'},
        right: {artifact: 'new line'},
      }

      const result = executeReportAction(action, filterResult, {filePath: 'test.json'})

      expect(result.urgency).to.equal(2)
      expect(result.content).to.include('- old line')
      expect(result.content).to.include('+ new line')
    })

    it('renders template with left and right artifacts', () => {
      const action = {
        template: 'Before: {{left.artifact}}\nAfter: {{right.artifact}}',
        urgency: 0,
      }
      const filterResult = {
        diffText: '',
        left: {artifact: 'version 1'},
        right: {artifact: 'version 2'},
      }

      const result = executeReportAction(action, filterResult, {filePath: 'file.txt'})

      expect(result.content).to.include('Before: version 1')
      expect(result.content).to.include('After: version 2')
    })

    it('handles multiline templates', () => {
      const action = {
        template: `# Change Report

File: {{filePath}}

## Diff
\`\`\`
{{diffText}}
\`\`\`
`,
        urgency: 1,
      }
      const filterResult = {
        diffText: '- removed\n+ added',
        left: {artifact: 'removed'},
        right: {artifact: 'added'},
      }

      const result = executeReportAction(action, filterResult, {filePath: 'config.json'})

      expect(result.content).to.include('# Change Report')
      expect(result.content).to.include('File: config.json')
      expect(result.content).to.include('- removed')
      expect(result.content).to.include('+ added')
    })
  })
})
