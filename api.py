"""
FastAPI backend — exposes ADO operations as REST endpoints for the React UI.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import config as cfg_module
import auth as auth_module
from ado_client import ADOClient
from llm_parser import parse_text_to_hierarchy, get_api_key

app = FastAPI(title="claudeADO API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models ───────────────────────────────────────────

class ConfigIn(BaseModel):
    ado_org_url: str
    ado_project: str
    assigned_to: str
    area_path: str = ""
    iteration_path: str = ""
    azureauth_path: str = ""

class ParseRequest(BaseModel):
    text: str

class CreateHierarchyRequest(BaseModel):
    hierarchy: Dict[str, Any]
    assigned_to: str = ""
    area_path: str = ""
    iteration_path: str = ""

class CreateSingleRequest(BaseModel):
    wit_type: str
    title: str
    description: str = ""
    assigned_to: str = ""
    area_path: str = ""
    iteration_path: str = ""
    effort: Optional[int] = None
    parent_id: Optional[int] = None

class UpdateRequest(BaseModel):
    title: Optional[str] = None
    state: Optional[str] = None
    assigned_to: Optional[str] = None
    area_path: Optional[str] = None
    iteration_path: Optional[str] = None

class DeleteRequest(BaseModel):
    ids: List[int]

# ─── Helpers ───────────────────────────────────────────────────

def _get_client() -> ADOClient:
    cfg = cfg_module.load()
    if not cfg.get("ado_org_url") or not cfg.get("ado_project"):
        raise HTTPException(status_code=400, detail="ADO not configured. Please save settings first.")
    token = auth_module.get_token(cfg.get("azureauth_path", ""))
    return ADOClient(cfg["ado_org_url"], cfg["ado_project"], token)

# ─── Config ────────────────────────────────────────────────────

@app.get("/api/config")
def get_config():
    return cfg_module.load()

@app.post("/api/config")
def save_config(body: ConfigIn):
    cfg_module.save(body.model_dump())
    auth_module.clear_cache()
    return {"status": "ok"}

# ─── Parse ─────────────────────────────────────────────────────

@app.post("/api/parse")
def parse_plan(body: ParseRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    api_key = get_api_key()
    hierarchy = parse_text_to_hierarchy(body.text, api_key)
    if not hierarchy:
        raise HTTPException(status_code=500, detail="Failed to parse plan. Check API key or try again.")
    return hierarchy

# ─── Create hierarchy ──────────────────────────────────────────

@app.post("/api/create")
def create_hierarchy(body: CreateHierarchyRequest):
    cfg = cfg_module.load()
    client = _get_client()
    results = client.create_hierarchy(
        hierarchy=body.hierarchy,
        assigned_to=body.assigned_to or cfg.get("assigned_to", ""),
        area_path=body.area_path or cfg.get("area_path", ""),
        iteration_path=body.iteration_path or cfg.get("iteration_path", ""),
    )
    if not results.get("feature"):
        raise HTTPException(status_code=500, detail="Failed to create work items in ADO")
    feature_id = results["feature"]["id"]
    return {
        "feature_id": feature_id,
        "feature_url": f"{cfg.get('ado_org_url')}/{cfg.get('ado_project')}/_workitems/edit/{feature_id}",
        "pbi_count": len(results["pbis"]),
        "task_count": sum(len(p["tasks"]) for p in results["pbis"]),
        "details": results,
    }

# ─── Create single ─────────────────────────────────────────────

@app.post("/api/create-single")
def create_single(body: CreateSingleRequest):
    cfg = cfg_module.load()
    client = _get_client()
    parent_url = None
    if body.parent_id:
        parent = client.get_work_item(body.parent_id)
        if parent:
            parent_url = parent["url"]
    result = client.create_work_item(
        wit_type=body.wit_type,
        title=body.title,
        description=body.description,
        assigned_to=body.assigned_to or cfg.get("assigned_to", ""),
        area_path=body.area_path or cfg.get("area_path", ""),
        iteration_path=body.iteration_path or cfg.get("iteration_path", ""),
        effort=body.effort,
        parent_url=parent_url,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create work item")
    result["ado_url"] = f"{cfg.get('ado_org_url')}/{cfg.get('ado_project')}/_workitems/edit/{result['id']}"
    return result

# ─── Get work item ─────────────────────────────────────────────

@app.get("/api/workitem/{item_id}")
def get_workitem(item_id: int):
    client = _get_client()
    item = client.get_work_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Work item {item_id} not found")
    f = item["fields"]
    assignee = f.get("System.AssignedTo", "")
    if isinstance(assignee, dict):
        assignee = assignee.get("uniqueName", "")
    return {
        "id": item["id"],
        "type": f.get("System.WorkItemType", ""),
        "title": f.get("System.Title", ""),
        "state": f.get("System.State", ""),
        "assigned_to": assignee,
        "area_path": f.get("System.AreaPath", ""),
        "iteration_path": f.get("System.IterationPath", ""),
    }

# ─── Update work item ──────────────────────────────────────────

@app.patch("/api/workitem/{item_id}")
def update_workitem(item_id: int, body: UpdateRequest):
    client = _get_client()
    fields = {}
    if body.title:          fields["System.Title"] = body.title
    if body.state:          fields["System.State"] = body.state
    if body.assigned_to:    fields["System.AssignedTo"] = body.assigned_to
    if body.area_path:      fields["System.AreaPath"] = body.area_path
    if body.iteration_path: fields["System.IterationPath"] = body.iteration_path
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    ok = client.update_work_item(item_id, fields)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update work item")
    return {"status": "ok"}

# ─── Delete ────────────────────────────────────────────────────

@app.post("/api/workitems/delete")
def delete_workitems(body: DeleteRequest):
    client = _get_client()
    results = {}
    for item_id in body.ids:
        results[str(item_id)] = client.delete_work_item(item_id)
    return {"results": results}

# ─── My Features ───────────────────────────────────────────────

@app.get("/api/features")
def get_features():
    client = _get_client()
    features = client.get_features_by_tag()
    return {"features": features}
