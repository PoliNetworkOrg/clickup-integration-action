import * as core from "@actions/core"
import * as github from "@actions/github"
import {
  addTag,
  createFeatureRequest,
  createProblem,
  linkIssueInTaskComment,
} from "./clickup"
import { template } from "./template"
import { getTaskIDFromComments } from "./utils"

const problemTagNames = ["type: bug", "type: chore", "type: security"]
const featureTagNames = ["type: suggestion"]

const ocktokit = github.getOctokit(core.getInput("github_token")).rest

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
    body: template("problem_created", task),
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
    body: template("feature_created", task),
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
  const taskID = getTaskIDFromComments(comments)

  const taskExists = taskID !== undefined
  const labelIsType = isTypeLabel(label.name)
  const labelIsSyncable = isSyncableLabel(label.name)

  console.log(
    `- Task exists: ${taskExists}\n- taskID: ${taskID}\n- labelIsType: ${labelIsType}\n- labelIsSyncable: ${labelIsSyncable}`
  )

  if (taskExists && labelIsSyncable) {
    // add the label to the task
    console.log("Adding label to task")
    addTag(taskID, label.name.toLowerCase())
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
        labels
          .filter(l => isSyncableLabel(l.name))
          .map(l => l.name.toLowerCase())
      )
    else if (isFeature)
      handleFeatureCreation(
        issue,
        labels
          .filter(l => isSyncableLabel(l.name))
          .map(l => l.name.toLowerCase())
      )

    return
  }
}
