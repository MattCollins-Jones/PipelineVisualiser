# Pipeline Visualiser

A Power Platform ToolBox tool that visualises deployment pipelines across environments.

## What's New

### v1.2.0
- 📋 **Run history screen** — click the History button on any pipeline to view its full deployment run history with filtering by status, target environment and date range, and sorting by any column
- 🔗 **Open in Dataverse** — each run history row has a direct link to open the stage run record in the Dataverse web browser
- ⚙️ **Settings panel** — configure theme (follow system or override) and export options from a dedicated settings menu
- 🎨 **Export options** — choose whether to include the heading/legend and/or the deployment history dots and last-deployed label in exported PNGs
- 👤🤖 **Delegated deployment icons** — pipelines/stages configured for delegated deployments now show a 👤 icon (delegate to user) or 🤖 icon (delegate to SPN), also shown in the legend
- 🖼️ **Export fixes** — resolved PNG export clipping and white-bar artefacts when the side panel is expanded or pipelines extend beyond the visible area

### v1.1.0
- 🌙 **Dark mode** — toggle between light and dark themes using the 🌙/☀️ button in the header; preference is saved across sessions
- 💬 **Smarter error handling** — if the Deployment Pipeline Configuration app is not installed, a helpful setup message is shown instead of a raw API error
- 📄 **MIT licence** — updated with correct year and author name

### v1.0.1
- Added `npm-shrinkwrap.json` for Power Platform ToolBox submission requirements

### v1.0.0
- Initial release

## Features

- Queries deployment pipeline data directly from Dataverse
- Displays each pipeline as a visual flow: **Dev Environment → Stage 1 → Stage 2 → ...**
- Colour-coded nodes — blue for Development, purple for Target environments
- Shared environment detection — environments appearing across multiple pipelines receive a unique accent colour so intersections are immediately visible
- Hover tooltips on each environment node and deployment dot showing contextual details
- Automatically refreshes when the active connection changes

### Delegated Deployments

- Pipelines and stages configured for delegated deployments display an icon:
  - 👤 Delegate to a user
  - 🤖 Delegate to a Service Principal (SPN)
- Icons are included in the legend at the top

### Deployment History

- Shows the **last deployment** against each pipeline — artifact name, solution version, status and date
- Displays the **last 5 deployments** as coloured indicator dots:
  - 🟢 Green — Succeeded
  - 🔴 Red — Failed
  - 🟡 Yellow — Cancelled
  - ⚫ Grey — Any other status
- Hover a dot to see full details: status, artifact name, and date
- Orphaned stage runs (not linked to a deployment stage) are automatically excluded

### Run History Screen

- Click the **📋 History** button on any pipeline card to open its full run history
- Filter by **status**, **target environment**, and **date range**
- Sort by any column: stage, environment, artifact, version, owner, status, start time, end time, duration
- Each row has a **🔗 Open** button to open the stage run record directly in the Dataverse web browser
- Back button returns to the pipeline overview

### Settings

- ⚙️ **Settings panel** accessible from the header
- **Theme** — choose to follow the system theme automatically, or override to always use light or dark mode
- **Export options** — control what is included in exported PNGs:
  - Show/hide the heading and legend
  - Show/hide the last deployed label and deployment history dots

### Export

- **Export PNG** button captures a snapshot of all pipeline cards and saves it as `pipelines-YYYY-MM-DD.png` — useful for storing in GitHub, Confluence, ADO, or other knowledge hubs
- Export respects the current settings for heading/legend and deployment history visibility

### Legend

- Collapsible legend at the top explains the dot colour key, delegated deployment icons, and highlights any shared environments
- Can be collapsed to maximise usable screen area

## Structure

```
src/
├── components/
│   ├── PipelineFlow.tsx        # Renders a single pipeline as a horizontal flow
│   ├── PipelineVisualiser.tsx  # Top-level component with loading/error states and export
│   ├── RunHistoryView.tsx      # Full run history screen with filtering and sorting
│   └── SettingsPanel.tsx       # Settings panel (theme and export options)
├── hooks/
│   ├── usePipelineData.ts      # Dataverse queries and data processing
│   ├── useRunHistory.ts        # Fetches all stage runs for a given pipeline
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
| `deploymentstagerun` | Deployment Stage Run records — status, artifact, version, start/end times |

## License

MIT

