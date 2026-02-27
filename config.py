"""
Configuration management — saves/loads ADO and app settings to config.json
"""
import json
import os
from pathlib import Path
from rich.console import Console
from rich.prompt import Prompt, Confirm

CONFIG_FILE = Path(__file__).parent / "config.json"
console = Console()

DEFAULTS = {
    "ado_org_url": "https://msazure.visualstudio.com",
    "ado_project": "One",
    "assigned_to": "",
    "area_path": "",
    "iteration_path": "",
    "azureauth_path": r"C:\Users\shragrawal\AppData\Local\Programs\AzureAuth\0.9.5\azureauth.exe",
}


def load() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def save(cfg: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)


def get_or_prompt(key: str, prompt_text: str, default: str = "", password: bool = False) -> str:
    cfg = load()
    existing = cfg.get(key, default)
    if existing and not password:
        return existing
    value = Prompt.ask(prompt_text, default=existing, password=password)
    if value and not password:
        cfg[key] = value
        save(cfg)
    return value


def setup(force: bool = False):
    """Interactive first-time or re-configuration."""
    cfg = load()

    console.print("\n[bold cyan]ADO Configuration[/bold cyan]")

    fields = [
        ("ado_org_url",    "ADO Organisation URL",          DEFAULTS["ado_org_url"]),
        ("ado_project",    "ADO Project name",              DEFAULTS["ado_project"]),
        ("assigned_to",    "Default assignee email",        DEFAULTS["assigned_to"]),
        ("area_path",      "Default Area Path (optional)",  DEFAULTS["area_path"]),
        ("iteration_path", "Default Iteration Path (optional)", DEFAULTS["iteration_path"]),
        ("azureauth_path", "AzureAuth.exe path",            DEFAULTS["azureauth_path"]),
    ]

    for key, label, default in fields:
        current = cfg.get(key, default)
        if force or not current:
            cfg[key] = Prompt.ask(f"  {label}", default=current)
        else:
            console.print(f"  [dim]{label}:[/dim] {current}")

    save(cfg)
    console.print("[green]Configuration saved.[/green]\n")
    return cfg


def require() -> dict:
    """Load config, prompt for missing required fields."""
    cfg = load()
    changed = False

    required = [
        ("ado_org_url",  "ADO Organisation URL",  DEFAULTS["ado_org_url"]),
        ("ado_project",  "ADO Project name",      DEFAULTS["ado_project"]),
        ("assigned_to",  "Your email (assignee)", ""),
    ]

    for key, label, default in required:
        if not cfg.get(key):
            cfg[key] = Prompt.ask(f"  {label}", default=default)
            changed = True

    if changed:
        save(cfg)

    return cfg
