import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    const clickupToken = core.getInput('clickup_api_key')
    const problemFolderId = core.getInput('problem_folder_id')
    const featureFolderId = core.getInput('feature_folder_id')

    console.log('Dumping inputs')
    console.log(clickupToken)
    console.log(problemFolderId)
    console.log(featureFolderId)

    console.log('Dumping context')
    console.log(`Hello ${github.context.actor}!`)
    console.log(`The event name is ${github.context.eventName}.`)
    console.log(`The ref is ${github.context.ref}.`)
    console.log(`The workflow is ${github.context.workflow}.`)
    console.log(`The action is ${github.context.action}.`)

    core.setOutput('clickup_api_key', clickupToken)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
