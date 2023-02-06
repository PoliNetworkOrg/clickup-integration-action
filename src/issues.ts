import * as core from "@actions/core"
import * as github from "@actions/github"
import { ClickUp, createProblem, linkIssueInTaskComment } from "./clickup"

const problemTagNames = ["type: bug", "type: chore", "type: security"]
const featureTagNames = ["type: suggestion"]

const ocktokit = github.getOctokit(core.getInput("github_token")).rest

const messages: Record<string, [string, string]> = {
  missing_label: [
    "Grazie per aver aperto questa issue. Per aiutarci a capire meglio il tuo problema, aggiungi una label indicante il tipo di problema (e.g `type: bug`).",
    "Thank you for opening this issue. To help us better understand your issue, please add a label indicating the type of problem (e.g `type: bug`).",
  ],
  problem_created: [
    "Grazie per la tua segnalazione, il nostro team ti darà un feedback al più presto.",
    "Thank you for your report, our team will get back to you as soon as possible.",
  ],
  feature_created: [
    "Grazie per il tuo suggerimento, le tue indicazioni verranno prese in cosiderazione e valutate dal nostro team!",
    "Thank you for your suggestion, your feedback will be taken into consideration and evaluated by our team!",
  ],
}

function taskMessage(task: ClickUp.Task) {
  return `Created a ClickUp task linked to this issue: [CU-${task.id}](${task.url})`
}

interface Label {
  color: string
  default: boolean
  description: string
  id: number
  name: string
  node_id: string
  url: string
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
    await ocktokit.issues.createComment({
      issue_number: issue.number,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      body: messages.missing_label.join("\n\n"),
    })
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

  if (isProblem) {
    // create a task in ClickUp
    const task = await createProblem(issue.title, issue.body, clickupTagsList)
    // comment with task link
    await ocktokit.issues.createComment({
      issue_number: issue.number,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      body: `${messages.problem_created.join("\n\n")}\n\n${taskMessage(task)}`,
    })
    if (issue.html_url) linkIssueInTaskComment(task.id, issue.html_url)
  } else if (isFeature) {
    // create a task in ClickUp
    const task = await createProblem(issue.title, issue.body, clickupTagsList)
    // comment with task link
    await ocktokit.issues.createComment({
      issue_number: issue.number,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      body: `${messages.feature_created.join("\n\n")}\n\n${taskMessage(task)}`,
    })
    if (issue.html_url) linkIssueInTaskComment(task.id, issue.html_url)
  }
}
