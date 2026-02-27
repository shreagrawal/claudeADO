# claudeADO

A CLI app that converts natural language project plans into ADO work items (Feature → PBI → Task) using Claude AI.

## Features

- **Text to ADO hierarchy** — paste any project plan and Claude parses it into Features, PBIs and Tasks with effort estimates
- **Full CRUD** — create, update and delete work items
- **Smart parenting** — parent-child links (Feature → PBI → Task) are resolved automatically
- **No PAT needed** — authenticates via AzureAuth using your Windows corporate identity (Microsoft internal)
- **Saved config** — ADO org URL, project, area path, iteration path saved locally

## Prerequisites

- Python 3.10+
- Node.js 18+ (for AzureAuth broker auth)
- AzureAuth installed (Microsoft internal)
- An [Anthropic API key](https://console.anthropic.com)

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/shreagrawal/claudeADO.git
cd claudeADO

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy env file and add your Anthropic API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 4. Run
python main.py
```

On first run you'll be prompted for:
- ADO Organisation URL (e.g. `https://msazure.visualstudio.com`)
- ADO Project name (e.g. `One`)
- Your email address (default assignee)
- Area path (optional)
- Iteration path (optional)

Settings are saved to `config.json` (gitignored) so you only need to enter them once.

## Usage

```
1  Create work items from text (Claude AI)
2  Create a single work item manually
3  Update a work item
4  Delete work items
5  Show current configuration
6  Reconfigure
q  Quit
```

### Create from text

Select option **1**, paste your project plan text, type `END` on a new line, confirm the preview and Claude will:
1. Parse the text into a Feature → PBI → Task hierarchy
2. Show a preview for confirmation
3. Create all items in ADO with correct parent links, area path and iteration

### Example input

```
Build a REST API backend for the product catalogue.

Phase 1:
- Set up the project structure and CI pipeline
- Implement product CRUD endpoints
- Add authentication and authorisation

Phase 2:
- Add search and filtering
- Performance optimisation
- Write integration tests
```

### Reconfigure

```bash
python main.py --configure
```

## Authentication

Uses AzureAuth broker mode (silent, no browser prompt) with your Windows corporate identity.
Falls back to web-based login, then PAT if AzureAuth is unavailable.

## Project structure

```
claudeADO/
├── main.py          # CLI entry point and menus
├── ado_client.py    # ADO REST API (create/update/delete/hierarchy)
├── llm_parser.py    # Claude API — text to hierarchy JSON
├── auth.py          # AzureAuth token acquisition
├── config.py        # Config management (config.json)
├── requirements.txt
├── .env.example
└── .gitignore
```
