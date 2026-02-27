# claudeADO

A React + FastAPI app that converts natural language project plans into Azure DevOps work items (Epic → Feature → PBI → Task) using Claude AI.

![claudeADO UI](https://img.shields.io/badge/stack-React%20%2B%20FastAPI%20%2B%20Claude%20AI-blue)

---

## Features

- **Text to ADO hierarchy** — paste any project plan and Claude AI parses it into Features, PBIs and Tasks with effort estimates
- **Optional Epic linking** — attach the created Feature to an existing Epic
- **Create single items** — manually create any work item type with full field control
- **Update & Delete** — update fields or delete work items by ID
- **My Features** — browse, open and delete all Features ever created by this app (tagged `claudeADO`)
- **Smart parenting** — parent-child links (Feature → PBI → Task) are resolved automatically via ADO REST API
- **No PAT needed** *(Microsoft internal)* — authenticates via AzureAuth using your Windows corporate identity
- **PAT fallback** — works with a Personal Access Token if AzureAuth is not available
- **Saved config** — ADO org, project, area path and iteration path saved locally

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Bundled with Node.js |
| AzureAuth | any | Microsoft internal only — for PAT-free auth |
| Anthropic API key | — | [console.anthropic.com](https://console.anthropic.com) |

---

## Local Setup & Run

### 1. Clone the repository

```bash
git clone https://github.com/shreagrawal/claudeADO.git
cd claudeADO
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Set your Anthropic API key

```bash
copy .env.example .env
```

Open `.env` and set:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

> **Microsoft internal:** If you use Claude Code, your key is auto-read from `~/.claude.json` — no `.env` needed.

### 5. Start the app

```powershell
.\start.ps1
```

This opens two PowerShell windows (backend + frontend) and launches the browser at **http://localhost:5173**.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

### 6. Configure ADO settings

On first launch, go to **Settings** in the sidebar and fill in:

| Field | Example |
|---|---|
| ADO Org URL | `https://msazure.visualstudio.com` |
| ADO Project | `One` |
| Assigned To | `you@company.com` |
| Area Path | `One\YourTeam\YourArea` |
| Iteration Path | `One\Sprint\CY26Q1` |
| AzureAuth Path | `C:\...\azureauth.exe` *(optional)* |

Click **Save Settings** — config is stored in `config.json` (gitignored) so you only configure once.

---

## Authentication

### Option A — AzureAuth (Microsoft internal, recommended)
Silent broker-mode authentication using your Windows corporate identity. No browser prompt, no PAT.
AzureAuth is pre-installed on most Microsoft developer machines at:
```
C:\Users\<you>\AppData\Local\Programs\AzureAuth\0.9.5\azureauth.exe
```

### Option B — Personal Access Token (PAT)
If AzureAuth is unavailable, the app falls back to a PAT. Generate one at:
`https://<your-org>.visualstudio.com/_usersSettings/tokens`

Required scopes: **Work Items (Read, Write & Manage)**

Set it in `.env`:
```
ADO_PAT=your-pat-here
```
Or enter it when prompted by the app.

---

## Usage Guide

### Create from Text
1. Click **Create from Text** in the sidebar
2. Paste your project plan (free-form text, bullet points, or structured notes)
3. Click **Parse with Claude →** — Claude AI generates a Feature → PBI → Task hierarchy
4. Review the preview tree
5. Optionally enter a **Parent Epic ID** to nest the Feature under an existing Epic
6. Optionally expand **ADO Settings** to override defaults for this creation only
7. Click **Create in ADO** — all items are created with correct parent links

### Create Single Item
Manually create one work item (Feature, Product Backlog Item, or Task) with full control over all fields including effort and parent ID.

### Update Item
Enter a work item ID to fetch its current values, edit any fields and save.

### Delete Items
Enter one or more work item IDs (comma or newline separated) to delete them (moved to ADO recycle bin).

### My Features
Shows all Features ever created by this app (tagged `claudeADO`). Supports:
- Click **Open in ADO →** to open directly in Azure DevOps
- Click **Delete** → **Confirm** to soft-delete a feature

---

## Project Structure

```
claudeADO/
├── api.py               # FastAPI backend — all REST endpoints
├── ado_client.py        # ADO REST API client (create/update/delete/WIQL)
├── llm_parser.py        # Claude AI — text to hierarchy JSON
├── auth.py              # AzureAuth / PAT token acquisition
├── config.py            # Config load/save (config.json)
├── main.py              # Legacy CLI entry point
├── requirements.txt
├── .env.example
├── start.ps1            # One-click launch script
└── frontend/
    ├── src/
    │   ├── pages/       # CreateFromText, CreateSingle, UpdateItem,
    │   │                #   DeleteItems, MyFeatures, Settings
    │   ├── components/  # Sidebar, HierarchyTree, Toast
    │   ├── api.ts       # Axios API calls to FastAPI
    │   └── types.ts     # TypeScript interfaces
    ├── package.json
    └── vite.config.ts
```

---

## Deploying to Azure (share with your team)

This app has two parts — a **FastAPI backend** and a **React frontend** — both can be deployed to Azure with no infrastructure expertise.

### Option 1 — Azure Container Apps (recommended, easiest)

Container Apps handles scaling, HTTPS and custom domains automatically.

#### Step 1 — Prerequisites
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed
- Docker Desktop installed and running
- An Azure subscription

#### Step 2 — Create a Dockerfile for the backend

Create `Dockerfile` in the repo root:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Step 3 — Build the React frontend into static files

```bash
cd frontend
npm install
npm run build   # outputs to frontend/dist/
cd ..
```

#### Step 4 — Serve the frontend from FastAPI

Add this to `api.py` after the existing imports:

```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Serve React frontend
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse("frontend/dist/index.html")
```

Update `frontend/src/api.ts` — change `BASE` to use a relative URL so it works on any domain:

```ts
const BASE = import.meta.env.VITE_API_URL || "";
```

Rebuild the frontend: `cd frontend && npm run build`

#### Step 5 — Create Azure resources and deploy

```bash
# Login
az login

# Variables — change these
RESOURCE_GROUP="rg-claudeado"
LOCATION="eastus"
ACR_NAME="claudeadoacr"          # must be globally unique
APP_NAME="claudeado-app"
ENVIRONMENT="claudeado-env"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

# Build and push image
az acr build --registry $ACR_NAME --image claudeado:latest .

# Create Container Apps environment
az containerapp env create --name $ENVIRONMENT --resource-group $RESOURCE_GROUP --location $LOCATION

# Deploy the container app
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --image $ACR_NAME.azurecr.io/claudeado:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --target-port 8000 \
  --ingress external \
  --env-vars ANTHROPIC_API_KEY=secretref:anthropic-key \
  --secrets anthropic-key=<your-api-key>

# Get the public URL
az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv
```

Share the output URL with your team — no install needed on their machines.

---

### Option 2 — Azure App Service (simpler, no Docker)

#### Step 1 — Build frontend

```bash
cd frontend && npm run build && cd ..
```

#### Step 2 — Update `api.py` to serve frontend (same as above)

#### Step 3 — Deploy via VS Code

1. Install the **Azure App Service** extension in VS Code
2. Right-click the repo folder → **Deploy to Web App**
3. Select your subscription, create a new Web App (Python 3.11, Linux)
4. Set environment variable `ANTHROPIC_API_KEY` in App Service → Configuration → Application Settings

#### Step 4 — Configure startup command

In App Service → Configuration → General Settings → Startup Command:
```
uvicorn api:app --host 0.0.0.0 --port 8000
```

---

### Authentication in Azure (important)

Since AzureAuth broker mode only works on Windows machines with Windows identity, deployed instances must use a **PAT token** or **Azure AD service principal**.

**Recommended for team deployment:**
1. Create an ADO PAT with Work Items (Read, Write & Manage) scope
2. Store it in **Azure Key Vault**
3. Reference it as an environment variable `ADO_PAT` in your Container App / App Service
4. Update `auth.py` to read `os.getenv("ADO_PAT")` as the primary auth method

---

### Estimated Azure costs

| Resource | Estimated cost |
|---|---|
| Container Apps (0.5 vCPU, 1 GB, ~8h/day) | ~$5–10/month |
| App Service (B1 plan) | ~$13/month |
| Azure Container Registry (Basic) | ~$5/month |

For internal team tools with low traffic, total cost is typically **under $20/month**.
