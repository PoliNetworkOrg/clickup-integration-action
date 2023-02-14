export function getTaskIDFromComments(
  comments: { body?: string | undefined }[] // shitty ass type def bc of the way the octokit lib is written
): string | undefined {
  return comments
    .map(comment => comment.body)
    .filter(b => b !== undefined)
    .map(b => b?.match(/CU-([a-z0-9]+)/i))
    .filter(m => m)
    .map(m => m?.[1])
    .filter(id => id)[0]
}
