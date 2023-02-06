import * as core from "@actions/core"
import * as github from "@actions/github"

import { handleIssueCreation } from "./issues"

async function run(): Promise<void> {
  try {
    const { context } = github
    const { payload, eventName } = context
    // if its an issue being opened
    if (eventName === "issues" && payload.action === "opened") {
      console.log("Handling issue creation")
      await handleIssueCreation()
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
