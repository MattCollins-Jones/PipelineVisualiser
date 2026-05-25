# Pipeline Visualiser

A Power Platform ToolBox tool that visualises deployment pipelines across environments.

## What's New

### v1.2.1
- 🔧 **Packaging fix** — corrects a packaging issue in v1.2.0 where the published bundle was missing features from v1.1.1–v1.1.5 (run history screen, settings panel, delegated deployment icons, export improvements)

### v1.2.0
- 📋 **Run history screen** — click the History button on any pipeline to view its full deployment run history with filtering by status, target environment and date range, and sorting by any column
- 🔗 **Open in Dataverse** — each run history row has a direct link to open the stage run record in the Dataverse web browser
- 🖼️ **Export fixes** — resolved PNG export clipping and white-bar artefacts when the side panel is expanded or pipelines extend beyond the visible area

### v1.1.5
- 👤 **Delegated deployment indicators** — pipeline stages configured for delegated deployments now show a visual badge:
  - 👤 **Delegated: User** — stage is delegated to the Stage Owner
  - 🤖 **Delegated: SPN** — stage is delegated to a Service Principal
- 🗝️ **Updated legend** — the legend now includes entries for both delegation types

### v1.1.4
- ⚙️ **Settings panel** — click the ⚙️ button in the header to open a slide-out settings panel
- 🎨 **Theme control** — choose between *Follow toolbox theme* (default), *Light*, or *Dark*; the tool always respects the Power Platform ToolBox app theme by default, with the option to override per-tool
- 👁️ **Display toggles** — individually show or hide:
  - Legend & notes
  - Deployment history dots (last 5 runs per stage)
  - Last deployed solution summary (artifact name, status, date)
- 💾 **Persistent settings** — all preferences are saved via the PPTB Settings API and restored on next launch

### v1.1.2
- 🖥️ **Toolbox theme sync** — the tool reads the Power Platform ToolBox app theme on startup and applies it automatically

### v1.1.1
- 🔧 **Package fix** — resolved a packaging issue that affected installation

### v1.1.0
- 🌙 **Dark mode** — full dark theme support across all UI elements
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

### Settings

Click ⚙️ in the header to open the settings panel:

| Setting | Options | Default |
|---|---|---|
| Theme | Follow toolbox theme / Light / Dark | Follow toolbox theme |
| Show legend | On / Off | On |
| Show deployment history dots | On / Off | On |
| Show last deployed solution | On / Off | On |

Settings are saved via the PPTB Settings API and persist between sessions.

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
- Can be collapsed to maximise usable screen area, or hidden entirely via Settings

## Structure

```
src/
├── components/
│   ├── PipelineFlow.tsx        # Renders a single pipeline as a horizontal flow
│   ├── PipelineVisualiser.tsx  # Top-level component with loading/error states and export
│   ├── RunHistoryView.tsx      # Full run history screen with filtering and sorting
│   └── SettingsPanel.tsx       # Slide-out settings panel
├── hooks/
│   ├── usePipelineData.ts      # Dataverse queries and data processing
│   ├── useRunHistory.ts        # Fetches all stage runs for a given pipeline
│   ├── useSettings.ts          # Settings persistence via PPTB Settings API
│   └── useToolboxAPI.ts        # Connection and event hooks
├── types/
│   ├── pipeline.ts             # TypeScript interfaces for pipeline data
│   └── settings.ts             # AppSettings interface and defaults
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

