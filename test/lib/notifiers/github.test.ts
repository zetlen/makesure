import {expect} from 'chai'

import {NotifyConfig} from '../../../src/lib/configuration/config.js'
import {processNotifications} from '../../../src/lib/notifiers/github.js'

/* eslint-disable @typescript-eslint/no-explicit-any, camelcase */
describe('GitHub Notifier', () => {
  const owner = 'owner'
  const repo = 'repo'
  const prNumber = 123
  const ref = 'feature-branch'

  let mockOctokit: any
  let comments: any[]
  let reviewRequests: any[]
  let labelsAdded: any[]
  let workflowsDispatched: any[]
  let warnings: any[][]
  let originalConsoleWarn: any

  beforeEach(() => {
    comments = []
    reviewRequests = []
    labelsAdded = []
    workflowsDispatched = []
    warnings = []

    originalConsoleWarn = console.warn
    console.warn = (...args) => warnings.push(args)

    mockOctokit = {
      rest: {
        actions: {
          async createWorkflowDispatch(args: any) {
            workflowsDispatched.push(args)
          },
        },
        issues: {
          async addLabels(args: any) {
            labelsAdded.push(args)
          },
          async createComment(args: any) {
            comments.push(args)
          },
        },
        pulls: {
          async requestReviewers(args: any) {
            reviewRequests.push(args)
          },
        },
      },
    }
  })

  afterEach(() => {
    console.warn = originalConsoleWarn
  })

  it('aggregates mentions into a single comment', async () => {
    const configs: NotifyConfig[] = [{github_mention: '@user1'}, {github_mention: '@user2, @user3'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(comments).to.have.lengthOf(1)
    expect(comments[0].body).to.contain('@user1')
    expect(comments[0].body).to.contain('@user2')
    expect(comments[0].body).to.contain('@user3')
  })

  it('handles comma-separated lists and snake_case keys', async () => {
    const configs: NotifyConfig[] = [
      {
        github_assign_reviewer: '@reviewer1, @org/team1',
        github_label: 'bug, urgent',
        github_workflow: 'ci.yml, security.yml',
      },
    ]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(reviewRequests).to.have.lengthOf(1)
    expect(reviewRequests[0].reviewers).to.include('reviewer1')
    expect(reviewRequests[0].team_reviewers).to.include('team1')

    expect(labelsAdded).to.have.lengthOf(1)
    expect(labelsAdded[0].labels).to.include('bug')
    expect(labelsAdded[0].labels).to.include('urgent')

    expect(workflowsDispatched).to.have.lengthOf(2)
    expect(workflowsDispatched.find((w) => w.workflow_id === 'ci.yml')).to.exist
    expect(workflowsDispatched.find((w) => w.workflow_id === 'security.yml')).to.exist
  })

  it('ignores mentions without @ prefix', async () => {
    const configs: NotifyConfig[] = [{github_mention: 'user1'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(comments).to.have.lengthOf(0)
  })

  it('ignores reviewers without @ prefix', async () => {
    const configs: NotifyConfig[] = [{github_assign_reviewer: 'user1'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(reviewRequests).to.have.lengthOf(0)
  })

  it('handles invalid team format (empty slug)', async () => {
    const configs: NotifyConfig[] = [{github_assign_reviewer: '@org/'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(reviewRequests).to.have.lengthOf(0)
  })

  it('handles API errors gracefully', async () => {
    mockOctokit.rest.issues.createComment = async () => {
      throw new Error('API Error')
    }

    const configs: NotifyConfig[] = [{github_mention: '@user1'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(warnings).to.have.lengthOf(1)
    expect(warnings[0][0]).to.contain('Failed to post mention comment')
  })

  it('handles workflow dispatch errors gracefully', async () => {
    mockOctokit.rest.actions.createWorkflowDispatch = async (args: any) => {
      if (args.workflow_id === 'fail.yml') throw new Error('Dispatch Error')
      workflowsDispatched.push(args)
    }

    const configs: NotifyConfig[] = [{github_workflow: 'success.yml, fail.yml'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(workflowsDispatched).to.have.lengthOf(1)
    expect(workflowsDispatched[0].workflow_id).to.equal('success.yml')

    expect(warnings).to.have.lengthOf(1)
    expect(warnings[0][0]).to.contain('Failed to dispatch workflow fail.yml')
  })
})
