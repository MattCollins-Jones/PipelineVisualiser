# Pipeline Visualiser

A Power Platform ToolBox tool that visualises deployment pipelines across environments.

## What's New

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

### Export

- **Export PNG** button captures a snapshot of all pipeline cards and saves it as `pipelines-YYYY-MM-DD.png` — useful for storing in GitHub, Confluence, ADO, or other knowledge hubs
- Export respects display settings — hidden sections are excluded from the snapshot

### Legend

- Collapsible legend at the top explains the dot colour key and highlights any shared environments
- Can be collapsed to maximise usable screen area, or hidden entirely via Settings

## Structure

```
src/
├── components/
│   ├── PipelineFlow.tsx        # Renders a single pipeline as a horizontal flow
│   ├── PipelineVisualiser.tsx  # Top-level component with loading/error states
│   └── SettingsPanel.tsx       # Slide-out settings panel
├── hooks/
│   ├── usePipelineData.ts      # Dataverse queries and data processing
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

