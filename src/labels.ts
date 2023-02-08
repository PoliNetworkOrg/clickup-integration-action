import * as core from "@actions/core"
import * as github from "@actions/github"
import {
  addTag,
  ClickUp,
  createFeatureRequest,
  createProblem,
  linkIssueInTaskComment,
} from "./clickup"

const problemTagNames = ["type: bug", "type: chore", "type: security"]
const featureTagNames = ["type: suggestion"]

const ocktokit = github.getOctokit(core.getInput("github_token")).rest

export const messages: Record<string, [string, string]> = {
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

export function isTypeLabel(label: string) {
  return label.startsWith("type:")
}

export function isSyncableLabel(label: string) {
  return label.startsWith("target:") || label.startsWith("platform:")
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

function taskMessage(task: ClickUp.Task) {
  return `Created a ClickUp task linked to this issue: [CU-${task.id}](${task.url})`
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
    body: `${messages.featureCreated.join("\n\n")}\n----\n${taskMessage(task)}`,
  })
  core.debug(`Response while commenting on issue: ${JSON.stringify(res.data)}`)
}

export async function handleLabeled() {
  // check if the issue has the label
  console.log("the whole context:")
  console.log(github.context)

  const issue = github.context.payload.issue
  if (!issue) {
    core.setFailed("No issue found")
    return
  }
  if (issue.closed_at) {
    console.log("Issue is closed, skipping...")
    return
  }

  const label: Label = github.context.payload.label
  if (!label) {
    core.setFailed("No label found")
    return
  }

  const labels: Label[] = issue.labels
  if (!labels) {
    core.setFailed("Labels is undefined")
    return
  }

  // check if there is already a comment with a task link
  const { data: comments } = await ocktokit.issues.listComments({
    issue_number: issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  })

  // extract the task id from the comment
  const taskID = comments
    .map(comment => comment.body)
    .filter(b => b !== undefined)
    .map(b => b?.match(/CU-([a-z0-9]+)/i))
    .filter(m => m)
    .map(m => m?.[1])
    .filter(id => id)[0]

  const taskExists = taskID !== undefined
  const labelIsType = isTypeLabel(label.name)
  const labelIsSyncable = isSyncableLabel(label.name)

  console.log(
    `- Task exists: ${taskExists}\n- taskID: ${taskID}\n- labelIsType: ${labelIsType}\n- labelIsSyncable: ${labelIsSyncable}`
  )

  if (taskExists && labelIsSyncable) {
    // add the label to the task
    console.log("Adding label to task")
    addTag(taskID, label.name)
    return
  }

  if (!taskExists && labelIsType) {
    // check if there are more then one type labels
    const typeLabels = labels.filter(l => isTypeLabel(l.name))
    if (typeLabels.length > 1) {
      core.setFailed("More than one type label found!")
      return
    }
    // create a task in ClickUp
    console.log("Creating task")

    // check if it's a problem or a feature
    const isProblem = typeLabels.some(l => problemTagNames.includes(l.name))
    const isFeature = typeLabels.some(l => featureTagNames.includes(l.name))

    if (isProblem)
      handleProblemCreation(
        issue,
        labels.filter(l => isSyncableLabel(l.name)).map(l => l.name)
      )
    else if (isFeature)
      handleFeatureCreation(
        issue,
        labels.filter(l => isSyncableLabel(l.name)).map(l => l.name)
      )

    return
  }
}
