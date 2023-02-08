import * as core from "@actions/core"
import * as github from "@actions/github"
import {
  ClickUp,
  createFeatureRequest,
  createProblem,
  linkIssueInTaskComment,
} from "./clickup"

const problemTagNames = ["type: bug", "type: chore", "type: security"]
const featureTagNames = ["type: suggestion"]

const ocktokit = github.getOctokit(core.getInput("github_token")).rest

const messages: Record<string, [string, string]> = {
  missingLabel: [
    "Grazie per aver aperto questa issue. Per aiutarci a capire meglio il tuo problema, aggiungi una label indicante il tipo di problema (e.g `type: bug`).",
    "Thank you for opening this issue. To help us better understand your issue, please add a label indicating the type of problem (e.g `type: bug`).",
  ],
  problemCreated: [
    "Grazie per la tua segnalazione, il nostro team ti darà un feedback al più presto.",
    "Thank you for your report, our team will get back to you as soon as possible.",
  ],
  featureCreated: [
    "Grazie per il tuo suggerimento, le tue indicazioni verranno prese in cosiderazione e valutate dal nostro team!",
    "Thank you for your suggestion, your feedback will be taken into consideration and evaluated by our team!",
  ],
}

function taskMessage(task: ClickUp.Task) {
  return `Created a ClickUp task linked to this issue: [CU-${task.id}](${task.url})`
}

export interface Label {
  color: string
  default: boolean
  description: string
  id: number
  name: string
  node_id: string
  url: string
}

export interface Issue {
  title?: string
  number: number
  html_url?: string
  body?: string
}

export async function handleProblemCreation(
  issue: Issue,
  clickupTagsList: string[]
) {
  // create a task in ClickUp
  const task = await createProblem(
    issue.title ?? `Issue #${issue.number}`,
    issue.body,
    clickupTagsList
  )
  if (issue.html_url) linkIssueInTaskComment(task.id, issue.html_url)
  // comment with task link
  const res = await ocktokit.issues.createComment({
    issue_number: issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: `${messages.problemCreated.join("\n\n")}\n----\n${taskMessage(task)}`,
  })
  core.debug(`Response while commenting on issue: ${JSON.stringify(res.data)}`)
}

export async function handleFeatureCreation(
  issue: Issue,
  clickupTagsList: string[]
) {
  // create a task in ClickUp
  const task = await createFeatureRequest(
    issue.title ?? `Issue #${issue.number}`,
    issue.body,
    clickupTagsList
  )
  if (issue.html_url) linkIssueInTaskComment(task.id, issue.html_url)
  // comment with task link
  const res = await ocktokit.issues.createComment({
    issue_number: issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: `${messages.featureCreated.join("\n\n")}\n\n${taskMessage(task)}`,
  })
  core.debug(`Response while commenting on issue: ${JSON.stringify(res.data)}`)
}

export async function handleIssueCreation() {
  // check if the issue has the label
  const issue = github.context.payload.issue
  if (!issue) {
    core.setFailed("No issue found")
    return
  }

  const labels: Label[] = issue.labels
  if (!labels) {
    core.setFailed("Labels is undefined")
    return
  }

  // filter for labels that start with 'type: '
  const typeLabels = labels.filter(label => label.name.startsWith("type"))

  if (typeLabels.length === 0) {
    console.log("No type label found, commenting...")
    const res = await ocktokit.issues.createComment({
      issue_number: issue.number,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      body: messages.missingLabel.join("\n\n"),
    })
    core.debug(
      `Response while commenting on issue: ${JSON.stringify(res.data)}`
    )
    return
  }

  const clickupTagsList = labels
    .filter(
      label =>
        label.name.startsWith("target") || label.name.startsWith("platform")
    )
    .map(label => label.name)

  // check if it's a problem or a feature
  const isProblem = typeLabels.some(label =>
    problemTagNames.includes(label.name)
  )
  const isFeature = typeLabels.some(label =>
    featureTagNames.includes(label.name)
  )

  if (isProblem) handleProblemCreation(issue, clickupTagsList)
  else if (isFeature) handleFeatureCreation(issue, clickupTagsList)
}
