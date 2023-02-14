import * as core from "@actions/core"
import * as github from "@actions/github"
import { updateTaskStatus } from "./clickup"
import { template } from "./template"

const ocktokit = github.getOctokit(core.getInput("github_token")).rest

export async function handlePRs() {
  // TODO: right now if a PR is opened and then reverted to draft, the status will be updated to "in review"
  const { context } = github
  const { payload } = context

  const { pull_request } = payload
  if (!pull_request) {
    core.setFailed("No pull request found")
    return
  }

  // check if pr is draft
  if (pull_request.draft) {
    console.log("PR is a draft, ignoring...")
    return
  }

  const branchName: string = pull_request.head.ref
  console.log(`Branch name: ${branchName}`)
  if (typeof branchName !== "string") {
    core.setFailed("No branch name found (?)")
    return
  }

  const matches = branchName.match(/feature\/CU-([a-z0-9]+)/i)
  const taskID = matches?.[1]
  if (!matches || !taskID) {
    console.log("This branch is not a feature branch!")
    return
  }

  console.log(`Handling PR event for Task ID: ${taskID}`)

  const OPENED =
    payload.action === "opened" ||
    payload.action === "reopened" ||
    payload.action === "ready_for_review"
  const newStatus = OPENED ? "in review" : "done" // TODO: make this configurable

  // update the task status
  console.log(`Updating task status to: ${newStatus}`)
  const task = await updateTaskStatus(taskID, newStatus)
  task.status.status = encodeURI(task.status.status) // encode the status, for templating
  task.status.color = task.status.color.replace("#", "") // remove the # from the color, for templating
  core.debug(`Response while updating task: ${JSON.stringify(task)}`)

  // add a comment to the PR
  console.log("Adding comment to PR")
  const res = await ocktokit.issues.createComment({
    issue_number: pull_request.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: template("pr_status_changed", task),
  })
  core.debug(`Response while commenting on PR: ${JSON.stringify(res.data)}`)
}
