import core from '@actions/core'
import github from '@actions/github'

async function run(): Promise<void> {
  try {
    const clickupToken = core.getInput('clickup_api_key')
    const problemFolderId = core.getInput('problem_folder_id')
    const featureFolderId = core.getInput('feature_folder_id')

    core.debug('Dumping inputs')
    core.debug(clickupToken)
    core.debug(problemFolderId)
    core.debug(featureFolderId)

    core.debug('Dumping context')
    core.debug(`Hello ${github.context.actor}!`)
    core.debug(`The event name is ${github.context.eventName}.`)
    core.debug(`The ref is ${github.context.ref}.`)
    core.debug(`The workflow is ${github.context.workflow}.`)
    core.debug(`The action is ${github.context.action}.`)

    core.setOutput('clickup_api_key', clickupToken)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
