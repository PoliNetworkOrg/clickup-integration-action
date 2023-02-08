import * as core from "@actions/core"
import * as github from "@actions/github"
import { Label } from "./issues"

const ocktokit = github.getOctokit(core.getInput("github_token")).rest

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

  console.log(`Task exists: ${taskExists}, taskID: ${taskID}`)

  if (taskExists) {
    console.log("Task already exists, syncing labels...")
    // sync the labels with the task
    // update the task with the new labels
    return
  } else {
    core.debug("Task does not exist, creating a new one...")
    // create a task in ClickUp
    // comment with task link
    return
  }
}
