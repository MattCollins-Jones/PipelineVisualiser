# Pipeline Visualiser

A Power Platform ToolBox tool that visualises deployment pipelines across environments.

## Features

- Queries deployment pipeline data directly from Dataverse
- Displays each pipeline as a visual flow: **Dev Environment → Stage 1 → Stage 2 → ...**
- Colour-coded nodes — blue for Development, purple for Target environments
- Shared environment detection — environments appearing across multiple pipelines receive a unique accent colour so intersections are immediately visible
- Hover tooltips on each environment node showing how many pipelines it belongs to
- Automatically refreshes when the active connection changes

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

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

The `dist/` folder can then be installed as a tool in Power Platform ToolBox.

## License

MIT

