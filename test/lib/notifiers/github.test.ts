import {expect} from 'chai'

import {NotifyConfig} from '../../../src/lib/configuration/config.js'
import {processNotifications} from '../../../src/lib/notifiers/github.js'

/* eslint-disable @typescript-eslint/no-explicit-any */
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

  beforeEach(() => {
    comments = []
    reviewRequests = []
    labelsAdded = []
    workflowsDispatched = []

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

  it('aggregates mentions into a single comment', async () => {
    const configs: NotifyConfig[] = [{'github-mention': '@user1'}, {'github-mention': '@user2'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(comments).to.have.lengthOf(1)
    expect(comments[0].body).to.contain('@user1')
    expect(comments[0].body).to.contain('@user2')
  })

  it('handles reviewers, labels and workflows', async () => {
    const configs: NotifyConfig[] = [
      {
        'github-assign-reviewer': 'reviewer1',
        'github-label': 'bug',
        'github-workflow': 'ci.yml',
      },
      {
        'github-assign-reviewer': 'org/team1',
        'github-label': 'urgent',
      },
    ]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(reviewRequests).to.have.lengthOf(1)
    expect(reviewRequests[0].reviewers).to.include('reviewer1')
    expect(reviewRequests[0].team_reviewers).to.include('team1')

    expect(labelsAdded).to.have.lengthOf(1)
    expect(labelsAdded[0].labels).to.include('bug')
    expect(labelsAdded[0].labels).to.include('urgent')

    expect(workflowsDispatched).to.have.lengthOf(1)
    expect(workflowsDispatched[0].workflow_id).to.equal('ci.yml')
    expect(workflowsDispatched[0].ref).to.equal(ref)
  })

  it('supports legacy github config as mention', async () => {
    const configs: NotifyConfig[] = [{github: '@legacy-user'}]

    await processNotifications(configs, {octokit: mockOctokit, owner, prNumber, ref, repo})

    expect(comments).to.have.lengthOf(1)
    expect(comments[0].body).to.contain('@legacy-user')
  })
})
