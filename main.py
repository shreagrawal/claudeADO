"""
claudeADO — Convert text to ADO work items using Claude AI.

Usage:
    python main.py                  # Interactive menu
    python main.py --configure      # Re-run configuration
"""
import os
import sys
import argparse
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt, Confirm, IntPrompt
from rich import box

import config as cfg_module
import auth
from ado_client import ADOClient
from llm_parser import parse_text_to_hierarchy, get_api_key

load_dotenv()
console = Console()

BANNER = """
 ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗ █████╗ ██████╗  ██████╗
██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔═══██╗
██║     ██║     ███████║██║   ██║██║  ██║█████╗  ███████║██║  ██║██║   ██║
██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ██╔══██║██║  ██║██║   ██║
╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗██║  ██║██████╔╝╚██████╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝  ╚═════╝
"""


def get_client(cfg: dict) -> ADOClient:
    token = auth.get_token(cfg.get("azureauth_path", ""))
    return ADOClient(
        org_url=cfg["ado_org_url"],
        project=cfg["ado_project"],
        token=token,
    )


# ─────────────────────────────────────────────
# 1. CREATE FROM TEXT
# ─────────────────────────────────────────────
def create_from_text(cfg: dict):
    console.print(Panel(
        "Paste or type your project plan below.\n"
        "Enter a blank line followed by [bold]END[/bold] on its own line when done.",
        title="Create from Text", style="cyan"
    ))

    lines = []
    while True:
        line = input()
        if line.strip().upper() == "END":
            break
        lines.append(line)
    text = "\n".join(lines).strip()

    if not text:
        console.print("[yellow]No text provided.[/yellow]")
        return

    api_key = get_api_key()
    hierarchy = parse_text_to_hierarchy(text, api_key)
    if not hierarchy:
        return

    # Preview
    _preview_hierarchy(hierarchy)

    if not Confirm.ask("\n[bold]Create these work items in ADO?[/bold]"):
        console.print("[yellow]Cancelled.[/yellow]")
        return

    # Optional overrides
    area_path      = Prompt.ask("  Area Path",      default=cfg.get("area_path", ""))
    iteration_path = Prompt.ask("  Iteration Path", default=cfg.get("iteration_path", ""))
    assigned_to    = Prompt.ask("  Assigned To",    default=cfg.get("assigned_to", ""))

    client  = get_client(cfg)
    results = client.create_hierarchy(
        hierarchy=hierarchy,
        assigned_to=assigned_to,
        area_path=area_path,
        iteration_path=iteration_path,
    )

    _print_summary(results, cfg)


# ─────────────────────────────────────────────
# 2. CREATE MANUALLY
# ─────────────────────────────────────────────
def create_manual(cfg: dict):
    console.print(Panel("Manual Work Item Creation", style="cyan"))

    wit_map = {
        "1": "Feature",
        "2": "Product Backlog Item",
        "3": "Task",
    }
    console.print("  1) Feature\n  2) Product Backlog Item\n  3) Task")
    choice = Prompt.ask("  Work item type", choices=["1", "2", "3"])
    wit_type = wit_map[choice]

    title       = Prompt.ask("  Title")
    description = Prompt.ask("  Description (optional)", default="")
    assigned_to = Prompt.ask("  Assigned To", default=cfg.get("assigned_to", ""))
    area_path   = Prompt.ask("  Area Path",   default=cfg.get("area_path", ""))
    iter_path   = Prompt.ask("  Iteration",   default=cfg.get("iteration_path", ""))
    effort      = None
    parent_url  = None

    if wit_type == "Task":
        effort = IntPrompt.ask("  Effort (days)", default=1)

    if wit_type in ("Product Backlog Item", "Task"):
        parent_id_str = Prompt.ask("  Parent work item ID (leave blank to skip)", default="")
        if parent_id_str.strip().isdigit():
            client = get_client(cfg)
            parent = client.get_work_item(int(parent_id_str))
            if parent:
                parent_url = parent["url"]
                console.print(f"  [green]Parent found: {parent['fields']['System.Title']}[/green]")
            else:
                console.print("  [yellow]Parent not found — item will be created without parent.[/yellow]")

    client = get_client(cfg)
    result = client.create_work_item(
        wit_type=wit_type,
        title=title,
        description=description,
        assigned_to=assigned_to,
        area_path=area_path,
        iteration_path=iter_path,
        effort=effort,
        parent_url=parent_url,
    )

    if result:
        console.print(f"\n[green]OK Created {wit_type} ID={result['id']}[/green]")
        console.print(f"  {cfg['ado_org_url']}/{cfg['ado_project']}/_workitems/edit/{result['id']}")


# ─────────────────────────────────────────────
# 3. UPDATE WORK ITEM
# ─────────────────────────────────────────────
def update_item(cfg: dict):
    console.print(Panel("Update Work Item", style="cyan"))
    item_id = IntPrompt.ask("  Work item ID to update")

    client = get_client(cfg)
    item   = client.get_work_item(item_id)
    if not item:
        console.print(f"[red]Work item {item_id} not found.[/red]")
        return

    f = item["fields"]
    console.print(f"\n  [bold]{f['System.WorkItemType']} #{item_id}:[/bold] {f['System.Title']}")
    console.print(f"  State:     {f.get('System.State', '')}")
    console.print(f"  Assigned:  {f.get('System.AssignedTo', {}).get('uniqueName', '') if isinstance(f.get('System.AssignedTo'), dict) else f.get('System.AssignedTo', '')}")

    console.print("\n  [dim]Which fields to update? Leave blank to skip.[/dim]")
    updates = {}

    new_title = Prompt.ask("  New title", default=f.get("System.Title", ""))
    if new_title != f.get("System.Title", ""):
        updates["System.Title"] = new_title

    new_state = Prompt.ask("  New state (New/Active/Resolved/Closed or blank)", default="")
    if new_state.strip():
        updates["System.State"] = new_state.strip()

    new_assignee = Prompt.ask("  New assignee email (blank to keep)", default="")
    if new_assignee.strip():
        updates["System.AssignedTo"] = new_assignee.strip()

    new_area = Prompt.ask("  New area path (blank to keep)", default="")
    if new_area.strip():
        updates["System.AreaPath"] = new_area.strip()

    new_iter = Prompt.ask("  New iteration path (blank to keep)", default="")
    if new_iter.strip():
        updates["System.IterationPath"] = new_iter.strip()

    if not updates:
        console.print("[yellow]No changes made.[/yellow]")
        return

    ok = client.update_work_item(item_id, updates)
    if ok:
        console.print(f"[green]OK Work item {item_id} updated.[/green]")
    else:
        console.print(f"[red]Failed to update work item {item_id}.[/red]")


# ─────────────────────────────────────────────
# 4. DELETE WORK ITEMS
# ─────────────────────────────────────────────
def delete_items(cfg: dict):
    console.print(Panel("Delete Work Items", style="cyan"))
    ids_input = Prompt.ask("  Work item IDs to delete (comma-separated, e.g. 123,456,789)")
    ids = [int(x.strip()) for x in ids_input.split(",") if x.strip().isdigit()]

    if not ids:
        console.print("[yellow]No valid IDs provided.[/yellow]")
        return

    console.print(f"\n  About to delete: {ids}")
    if not Confirm.ask("  [bold red]Confirm deletion?[/bold red]"):
        console.print("[yellow]Cancelled.[/yellow]")
        return

    client = get_client(cfg)
    for item_id in ids:
        ok = client.delete_work_item(item_id)
        if ok:
            console.print(f"  [green]OK Deleted ID={item_id}[/green]")
        else:
            console.print(f"  [red]✗ Failed to delete ID={item_id}[/red]")


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _preview_hierarchy(hierarchy: dict):
    console.print()
    feature = hierarchy.get("feature", {})
    console.print(f"[bold yellow]Feature:[/bold yellow] {feature.get('title', '')}")
    console.print(f"  [dim]{feature.get('description', '')}[/dim]")

    for i, pbi in enumerate(hierarchy.get("pbis", []), 1):
        console.print(f"\n  [bold cyan]PBI {i}:[/bold cyan] {pbi['title']}")
        console.print(f"    [dim]{pbi.get('description', '')}[/dim]")
        for t in pbi.get("tasks", []):
            console.print(f"    [green]->[/green] [{t.get('effort', '?')}d] {t['title']}")


def _print_summary(results: dict, cfg: dict):
    console.print()
    feature = results.get("feature")
    if not feature:
        return

    total_tasks = sum(len(p["tasks"]) for p in results.get("pbis", []))
    console.print(Panel(
        f"[bold green]OK Done![/bold green]\n\n"
        f"Feature  : [cyan]#{feature['id']}[/cyan]\n"
        f"PBIs     : [cyan]{len(results['pbis'])}[/cyan]\n"
        f"Tasks    : [cyan]{total_tasks}[/cyan]\n\n"
        f"[link]{cfg['ado_org_url']}/{cfg['ado_project']}/_workitems/edit/{feature['id']}[/link]",
        title="Summary", style="green"
    ))


def _show_config(cfg: dict):
    t = Table(box=box.ROUNDED, show_header=False)
    t.add_column("Key",   style="dim cyan")
    t.add_column("Value", style="white")
    for k, v in cfg.items():
        if k != "azureauth_path":
            t.add_row(k, v)
    console.print(t)


# ─────────────────────────────────────────────
# MAIN MENU
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="claudeADO — Text to ADO work items")
    parser.add_argument("--configure", action="store_true", help="Re-run configuration")
    args = parser.parse_args()

    console.print(f"[bold cyan]{BANNER}[/bold cyan]", highlight=False)
    console.print("[bold]ADO Work Item Manager powered by Claude AI[/bold]\n")

    if args.configure:
        cfg_module.setup(force=True)
        return

    # Load or prompt for config on first run
    cfg = cfg_module.require()

    while True:
        console.print("\n[bold]What would you like to do?[/bold]")
        console.print("  [cyan]1[/cyan]  Create work items from text (Claude AI)")
        console.print("  [cyan]2[/cyan]  Create a single work item manually")
        console.print("  [cyan]3[/cyan]  Update a work item")
        console.print("  [cyan]4[/cyan]  Delete work items")
        console.print("  [cyan]5[/cyan]  Show current configuration")
        console.print("  [cyan]6[/cyan]  Reconfigure")
        console.print("  [cyan]q[/cyan]  Quit")

        choice = Prompt.ask("\nChoice", choices=["1", "2", "3", "4", "5", "6", "q"])

        if choice == "1":
            create_from_text(cfg)
        elif choice == "2":
            create_manual(cfg)
        elif choice == "3":
            update_item(cfg)
        elif choice == "4":
            delete_items(cfg)
        elif choice == "5":
            _show_config(cfg)
        elif choice == "6":
            cfg = cfg_module.setup(force=True)
        elif choice == "q":
            console.print("[dim]Goodbye.[/dim]")
            break

        auth.clear_cache()  # refresh token between operations


if __name__ == "__main__":
    main()
