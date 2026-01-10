import {Octokit} from 'octokit'

import {NotifyConfig} from '../configuration/config.js'

export interface NotificationContext {
  octokit: Octokit
  owner: string
  prNumber: number
  ref: string
  repo: string
}

export async function processNotifications(configs: NotifyConfig[], context: NotificationContext): Promise<void> {
  const mentions = new Set<string>()
  const reviewers = new Set<string>()
  const labels = new Set<string>()
  const workflows = new Set<string>()

  for (const config of configs) {
    if (config.github_mention) {
      for (const m of parseList(config.github_mention)) mentions.add(m)
    }

    if (config.github_assign_reviewer) {
      for (const r of parseList(config.github_assign_reviewer)) reviewers.add(r)
    }

    if (config.github_label) {
      for (const l of parseList(config.github_label)) labels.add(l)
    }

    if (config.github_workflow) {
      for (const w of parseList(config.github_workflow)) workflows.add(w)
    }
  }

  await processMentions(mentions, context)
  await processReviewers(reviewers, context)
  await processLabels(labels, context)
  await processWorkflows(workflows, context)
}

function parseList(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/* eslint-disable camelcase */
async function processMentions(mentions: Set<string>, context: NotificationContext) {
  if (mentions.size === 0) return

  // Validate that mentions start with @
  const validMentions = [...mentions].filter((m) => m.startsWith('@'))

  if (validMentions.length === 0) return

  const body = `Distill notifications:
${validMentions.join(' ')}`
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
      if (!reviewer.startsWith('@')) continue

      // Clean up input
      const clean = reviewer.replace(/^@/, '')

      // Simple heuristic: if it contains slash, it's likely org/team-slug format.
      if (clean.includes('/')) {
        const teamSlug = clean.split('/')[1]
        if (teamSlug) {
          teams.push(teamSlug)
        }
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

  const dispatches = [...workflows].map((workflow) =>
    context.octokit.rest.actions.createWorkflowDispatch({
      owner: context.owner,
      ref: context.ref,
      repo: context.repo,
      workflow_id: workflow,
    }),
  )

  const results = await Promise.allSettled(dispatches)

  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      const workflow = [...workflows][index]
      console.warn(`Failed to dispatch workflow ${workflow}:`, result.reason)
    }
  }
}
/* eslint-enable camelcase */
