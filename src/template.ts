import fs from "fs/promises"
import { render } from "mustache"

const template_names = [
  "feature_created",
  "missing_labels",
  "problem_created",
] as const

export async function template(
  template_name: typeof template_names[number],
  data?: any
) {
  const tmp = await fs.readFile(`./dist/templates/${template_name}.md`, "utf8")
  return render(tmp, data)
}
