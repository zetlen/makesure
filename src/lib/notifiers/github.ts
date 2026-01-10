import {Octokit} from 'octokit'

import {NotifyConfig} from '../configuration/config.js'

export interface NotificationContext {
  octokit: Octokit
  owner: string
  prNumber: number
  ref: string
  repo: string
}

/* eslint-disable camelcase */

export async function processNotifications(configs: NotifyConfig[], context: NotificationContext): Promise<void> {
  const mentions = new Set<string>()
  const reviewers = new Set<string>()
  const labels = new Set<string>()
  const workflows = new Set<string>()

  for (const config of configs) {
    if (config['github-mention']) mentions.add(config['github-mention'])
    if (config['github-assign-reviewer']) reviewers.add(config['github-assign-reviewer'])
    if (config['github-label']) labels.add(config['github-label'])
    if (config['github-workflow']) workflows.add(config['github-workflow'])

    // Legacy support: config.github could be a mention or team
    if (config.github) {
      mentions.add(config.github)
    }
  }

  await processMentions(mentions, context)
  await processReviewers(reviewers, context)
  await processLabels(labels, context)
  await processWorkflows(workflows, context)
}

async function processMentions(mentions: Set<string>, context: NotificationContext) {
  if (mentions.size === 0) return

  const body = `Distill notifications:\n${[...mentions].join(' ')}`
  try {
    await context.octokit.rest.issues.createComment({
      body,
      issue_number: context.prNumber,
      owner: context.owner,
      repo: context.repo,
    })
  } catch (error) {
    console.warn('Failed to post mention comment:', error)
  }
}

async function processReviewers(reviewers: Set<string>, context: NotificationContext) {
  if (reviewers.size === 0) return

  try {
    const users: string[] = []
    const teams: string[] = []

    for (const reviewer of reviewers) {
      // Clean up input
      const clean = reviewer.replace(/^@/, '')

      // Simple heuristic: if it contains slash, it's likely org/team
      if (clean.includes('/')) {
        teams.push(clean.split('/')[1])
      } else {
        users.push(clean)
      }
    }

    // Only make request if we have users or teams
    if (users.length > 0 || teams.length > 0) {
      await context.octokit.rest.pulls.requestReviewers({
        owner: context.owner,
        pull_number: context.prNumber,
        repo: context.repo,
        reviewers: users.length > 0 ? users : undefined,
        team_reviewers: teams.length > 0 ? teams : undefined,
      })
    }
  } catch (error) {
    console.warn('Failed to request reviewers:', error)
  }
}

async function processLabels(labels: Set<string>, context: NotificationContext) {
  if (labels.size === 0) return

  try {
    await context.octokit.rest.issues.addLabels({
      issue_number: context.prNumber,
      labels: [...labels],
      owner: context.owner,
      repo: context.repo,
    })
  } catch (error) {
    console.warn('Failed to add labels:', error)
  }
}

async function processWorkflows(workflows: Set<string>, context: NotificationContext) {
  if (workflows.size === 0) return

  /* eslint-disable no-await-in-loop */
  for (const workflow of workflows) {
    try {
      await context.octokit.rest.actions.createWorkflowDispatch({
        owner: context.owner,
        ref: context.ref,
        repo: context.repo,
        workflow_id: workflow,
      })
    } catch (error) {
      console.warn(`Failed to dispatch workflow ${workflow}:`, error)
    }
  }
  /* eslint-enable no-await-in-loop */
}
/* eslint-enable camelcase */
