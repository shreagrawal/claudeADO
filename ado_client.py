"""
ADO REST API client — create, update, delete work items with parent linking.
Supports Feature → Product Backlog Item → Task hierarchy.
"""
import json
import time
import requests
from rich.console import Console

console = Console()


class ADOClient:
    def __init__(self, org_url: str, project: str, token: str):
        self.org_url   = org_url.rstrip("/")
        self.project   = project
        self.token     = token
        self.base_url  = f"{self.org_url}/{self.project}/_apis/wit"
        self.session   = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        })

    def _patch_headers(self):
        return {"Content-Type": "application/json-patch+json"}

    def _build_body(self, fields: dict, parent_url: str = None) -> list:
        body = [{"op": "add", "path": f"/fields/{k}", "value": v}
                for k, v in fields.items() if v is not None and v != ""]
        if parent_url:
            body.append({
                "op": "add",
                "path": "/relations/-",
                "value": {
                    "rel": "System.LinkTypes.Hierarchy-Reverse",
                    "url": parent_url,
                    "attributes": {"comment": ""}
                }
            })
        return body

    def create_work_item(
        self,
        wit_type: str,
        title: str,
        description: str = "",
        assigned_to: str = "",
        area_path: str = "",
        iteration_path: str = "",
        effort: int = None,
        parent_url: str = None,
    ) -> dict | None:
        fields = {"System.Title": title}
        if description:
            fields["System.Description"] = description
        if assigned_to:
            fields["System.AssignedTo"] = assigned_to
        if area_path:
            fields["System.AreaPath"] = area_path
        if iteration_path:
            fields["System.IterationPath"] = iteration_path
        if effort is not None:
            fields["Microsoft.VSTS.Scheduling.Effort"] = effort

        body = self._build_body(fields, parent_url)
        url  = f"{self.base_url}/workitems/${wit_type}?api-version=7.0"

        r = self.session.post(url, headers=self._patch_headers(), data=json.dumps(body))
        if r.status_code in (200, 201):
            item = r.json()
            return {"id": item["id"], "url": item["url"], "type": wit_type, "title": title}
        else:
            console.print(f"  [red]ERROR creating '{title}': {r.status_code} — {r.text[:200]}[/red]")
            return None

    def update_work_item(self, item_id: int, fields: dict) -> bool:
        body = [{"op": "add", "path": f"/fields/{k}", "value": v}
                for k, v in fields.items()]
        url  = f"{self.base_url}/workitems/{item_id}?api-version=7.0"
        r    = self.session.patch(url, headers=self._patch_headers(), data=json.dumps(body))
        return r.status_code in (200, 201)

    def delete_work_item(self, item_id: int) -> bool:
        url = f"{self.base_url}/workitems/{item_id}?api-version=7.0"
        r   = self.session.delete(url)
        return r.status_code in (200, 204)

    def get_work_item(self, item_id: int) -> dict | None:
        url = f"{self.base_url}/workitems/{item_id}?api-version=7.0&$expand=relations"
        r   = self.session.get(url)
        if r.status_code == 200:
            return r.json()
        return None

    def create_hierarchy(
        self,
        hierarchy: dict,
        assigned_to: str = "",
        area_path: str = "",
        iteration_path: str = "",
        delay: float = 0.2,
    ) -> dict:
        """
        Creates a full Feature → PBIs → Tasks hierarchy from a parsed dict.
        Returns a summary of all created IDs.
        """
        results = {"feature": None, "pbis": []}

        # --- Feature ---
        feature_data = hierarchy.get("feature", {})
        console.print(f"\n[bold]Creating Feature:[/bold] {feature_data['title']}")
        feature = self.create_work_item(
            wit_type="Feature",
            title=feature_data["title"],
            description=feature_data.get("description", ""),
            assigned_to=assigned_to,
            area_path=area_path,
            iteration_path=iteration_path,
        )
        if not feature:
            console.print("[red]Failed to create Feature. Aborting.[/red]")
            return results

        console.print(f"  [green]OK Feature ID={feature['id']}[/green]")
        results["feature"] = feature

        # --- PBIs ---
        for pbi_data in hierarchy.get("pbis", []):
            console.print(f"\n[bold]  Creating PBI:[/bold] {pbi_data['title']}")
            pbi = self.create_work_item(
                wit_type="Product Backlog Item",
                title=pbi_data["title"],
                description=pbi_data.get("description", ""),
                assigned_to=assigned_to,
                area_path=area_path,
                iteration_path=iteration_path,
                parent_url=feature["url"],
            )
            if not pbi:
                console.print(f"  [red]Skipping tasks for failed PBI.[/red]")
                continue

            console.print(f"    [green]OK PBI ID={pbi['id']}[/green]")
            pbi_result = {"pbi": pbi, "tasks": []}

            # --- Tasks ---
            for task_data in pbi_data.get("tasks", []):
                time.sleep(delay)
                task = self.create_work_item(
                    wit_type="Task",
                    title=task_data["title"],
                    assigned_to=assigned_to,
                    area_path=area_path,
                    iteration_path=iteration_path,
                    effort=task_data.get("effort"),
                    parent_url=pbi["url"],
                )
                if task:
                    console.print(f"      [green]OK Task ID={task['id']}[/green] [{task_data.get('effort', '?')}d] {task_data['title']}")
                    pbi_result["tasks"].append(task)

            results["pbis"].append(pbi_result)
            time.sleep(delay)

        return results
