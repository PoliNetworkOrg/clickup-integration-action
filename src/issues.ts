import * as core from "@actions/core"
import * as github from "@actions/github"
import { updateTaskStatus } from "./clickup"
import { isTypeLabel, Label } from "./labels"
import { template } from "./template"
import { getTaskIDFromComments } from "./utils"

const ocktokit = github.getOctokit(core.getInput("github_token")).rest

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
  const typeLabels = labels.filter(label => isTypeLabel(label.name))

  if (typeLabels.length === 0) {
    console.log("No type label found, commenting...")
    const res = await ocktokit.issues.createComment({
      issue_number: issue.number,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      body: template("missing_labels"),
    })
    core.debug(
      `Response while commenting on issue: ${JSON.stringify(res.data)}`
    )
    return
  }
}

export async function handleIssueClosed() {
  // TODO: do not change the status if the issue was closed by a PR
  // check in previous comments if the issue has a linked task
  // if it does, close the task
  const issue = github.context.payload.issue
  if (!issue) {
    core.setFailed("No issue found")
    return
  }

  const { data: comments } = await ocktokit.issues.listComments({
    issue_number: issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  })

  const taskID = getTaskIDFromComments(comments)

  if (taskID) {
    // close the task
    console.log("Closing task")
    await updateTaskStatus(taskID, "done") // TODO: make status configurable
  } else {
    console.log("An issue was closed, but no task was linked to it.")
    return
  }
}
