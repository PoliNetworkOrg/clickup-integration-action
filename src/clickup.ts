import * as core from "@actions/core"
import fetch from "node-fetch"

export declare module ClickUp {
  export interface Status {
    status: string
    color: string
    orderindex: number
    type: string
  }

  export interface Creator {
    id: number
    username: string
    color: string
    profilePicture: string
  }

  export interface Value {
    value: string
  }

  export interface CustomField {
    id: string
    name: string
    type: string
    type_config: any
    date_created: string
    hide_from_guests: boolean
    value: Value
    required: boolean
  }

  export interface List {
    id: string
  }

  export interface Folder {
    id: string
  }

  export interface Space {
    id: string
  }

  export interface Task {
    id: string
    custom_id?: any
    name: string
    text_content: string
    description: string
    status: Status
    orderindex: string
    date_created: string
    date_updated: string
    date_closed?: any
    date_done?: any
    creator: Creator
    assignees: any[]
    checklists: any[]
    tags: string[]
    parent: string
    priority?: any
    due_date?: any
    start_date?: any
    time_estimate?: any
    time_spent?: any
    custom_fields: CustomField[]
    list: List
    folder: Folder
    space: Space
    url: string
  }

  export interface Comment {
    id: string
    hist_id: string
    date: number
  }
}

export async function linkIssueInTaskComment(
  issue_url: string,
  task_id: string
) {
  try {
    const clickupToken = core.getInput("clickup_api_key")

    console.log("Creating comment on task")
    const response = await fetch(
      `https://api.clickup.com/api/v2/task/${task_id}/comment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: clickupToken,
        },
        body: JSON.stringify({
          text: `Linked to GitHub issue: ${issue_url}`,
        }),
      }
    )

    const data = await response.json()
    core.debug(`Response body: ${JSON.stringify(data)}\n`)
    return data as ClickUp.Comment
  } catch (e) {
    console.log(`Failed to create comment: ${e}`)
  }
}

async function createTask(
  listId: string,
  name: string,
  body?: string,
  tags?: string[]
) {
  const clickupToken = core.getInput("clickup_api_key")

  console.log(`Creating task in list ${listId}`)
  core.debug(`Name: ${name}`)
  core.debug(`Body: ${body}`)
  core.debug(`Tags: ${tags?.join(", ")}`)

  const response = await fetch(
    `https://api.clickup.com/api/v2/list/${listId}/task`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: clickupToken,
      },
      body: JSON.stringify({
        name,
        description: body,
        status: "to do",
        tags,
      }),
    }
  )

  core.debug(`Response: ${response.status} ${response.statusText}`)
  const data = await response.json()
  core.debug(`Response body: ${JSON.stringify(data)}\n`)
  return data as ClickUp.Task
}

export async function createProblem(
  name: string,
  body?: string,
  tags?: string[]
) {
  const problemListId = core.getInput("problem_list_id")
  return await createTask(problemListId, name, body, tags)
}

export async function createFeatureRequest(
  name: string,
  body?: string,
  tags?: string[]
) {
  const featureListId = core.getInput("feature_list_id")
  return await createTask(featureListId, name, body, tags)
}
