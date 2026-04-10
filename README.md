# Pipeline Visualiser

A Power Platform ToolBox tool that visualises deployment pipelines across environments.

## Features

- Queries deployment pipeline data directly from Dataverse
- Displays each pipeline as a visual flow: **Dev Environment → Stage 1 → Stage 2 → ...**
- Colour-coded nodes — blue for Development, purple for Target environments
- Shared environment detection — environments appearing across multiple pipelines receive a unique accent colour so intersections are immediately visible
- Hover tooltips on each environment node and deployment dot showing contextual details
- Automatically refreshes when the active connection changes

### Deployment History

- Shows the **last deployment** against each pipeline — artifact name, solution version, status and date
- Displays the **last 5 deployments** as coloured indicator dots:
  - 🟢 Green — Succeeded
  - 🔴 Red — Failed
  - 🟡 Yellow — Cancelled
  - ⚫ Grey — Any other status
- Hover a dot to see full details: status, artifact name, and date
- Orphaned stage runs (not linked to a deployment stage) are automatically excluded

### Export

- **Export PNG** button captures a snapshot of all pipeline cards and saves it as `pipelines-YYYY-MM-DD.png` — useful for storing in GitHub, Confluence, ADO, or other knowledge hubs

### Legend

- Collapsible legend at the top explains the dot colour key and highlights any shared environments
- Can be collapsed to maximise usable screen area

## Structure

```
src/
├── components/
│   ├── PipelineFlow.tsx        # Renders a single pipeline as a horizontal flow
│   └── PipelineVisualiser.tsx  # Top-level component with loading/error states
├── hooks/
│   ├── usePipelineData.ts      # Dataverse queries and data processing
│   └── useToolboxAPI.ts        # Connection and event hooks
├── types/
│   └── pipeline.ts             # TypeScript interfaces
├── App.tsx
├── index.css
└── main.tsx
```

## Dataverse Tables

| Table | Purpose |
|---|---|
| `deploymentpipeline` | Parent pipeline record |
| `deploymentstage` | Links environments to a pipeline; self-referential for ordering |
| `deploymentenvironment` | Environment records (name, type, ID) |
| `deploymentpipeline_deploymentenvironment` | N:N intersect — links pipelines to their dev environment |
| `deploymentstagrun` | Deployment Stage Run records — status, artifact, version, start/end times |

## License

MIT

