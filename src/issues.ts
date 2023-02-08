import * as core from "@actions/core"
import * as github from "@actions/github"
import { isTypeLabel, Label, messages } from "./labels"

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
      body: messages.missingLabel.join("\n\n"),
    })
    core.debug(
      `Response while commenting on issue: ${JSON.stringify(res.data)}`
    )
    return
  }
}
