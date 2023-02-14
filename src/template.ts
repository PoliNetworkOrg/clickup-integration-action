import { render } from "mustache"

const templates = {
  feature_created: `
### Grazie per il tuo suggerimento
Le tue indicazioni verranno prese in cosiderazione e valutate dal nostro team!

### Thank you for your suggestion
Your feedback will be taken into consideration and evaluated by our team!

---

Created a ClickUp task linked to this issue: [CU-{{id}}]({{url}})
`,
  missing_labels: `
### Grazie per aver aperto questa issue
Per aiutarci a capire meglio il tuo problema, **aggiungi una label indicante il
tipo di problema** (e.g \`type: bug\`).

### Thank you for opening this issue
To help us better understand your issue, **please add a label indicating the
type of problem** (e.g \`type: bug\`).
  `,
  problem_created: `
### Grazie per la tua segnalazione
Il nostro team ti darà un feedback al più presto.

### Thank you for your report
Our team will get back to you as soon as possible.

---

Created a ClickUp task linked to this issue: [CU-{{id}}]({{url}})
`,
} as const

export function template(template_name: keyof typeof templates, data?: any) {
  return render(templates[template_name], data)
}
