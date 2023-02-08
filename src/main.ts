import * as core from "@actions/core"
import * as github from "@actions/github"

import { handleIssueCreation } from "./issues"
import { handleLabeled } from "./labels"

async function run(): Promise<void> {
  try {
    core.debug(`Problem list ID: ${core.getInput("problem_list_id")}`)
    core.debug(`Feature list ID: ${core.getInput("feature_list_id")}`)

    const { context } = github
    const { payload, eventName } = context

    core.debug(`Event name: ${github.context.eventName}`)

    // if its an issue being opened
    if (eventName === "issues") {
      if (payload.action === "opened") {
        console.log("Handling issue creation")
        await handleIssueCreation()
      } else if (payload.action === "labeled") {
        console.log("Handling label addition")
        await handleLabeled()
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
