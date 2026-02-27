"""
Authentication — gets ADO bearer token via AzureAuth (no PAT needed).
Falls back to prompting for a PAT if AzureAuth is not available.
"""
import subprocess
import os
from pathlib import Path
from rich.console import Console
from rich.prompt import Prompt

console = Console()

DEFAULT_AZUREAUTH = r"C:\Users\shragrawal\AppData\Local\Programs\AzureAuth\0.9.5\azureauth.exe"

_token_cache: str | None = None


def get_token(azureauth_path: str = DEFAULT_AZUREAUTH) -> str:
    global _token_cache

    # Return cached token within the same session
    if _token_cache:
        return _token_cache

    # Try AzureAuth broker mode (silent, uses Windows identity)
    path = azureauth_path or DEFAULT_AZUREAUTH
    if Path(path).exists():
        try:
            result = subprocess.run(
                [path, "ado", "token", "--mode", "broker",
                 "--domain", "microsoft.com", "--output", "token"],
                capture_output=True, text=True, timeout=30
            )
            token = result.stdout.strip()
            if token:
                _token_cache = token
                return token
        except Exception as e:
            console.print(f"[yellow]AzureAuth broker failed: {e}[/yellow]")

    # Try IWA mode
    if Path(path).exists():
        try:
            result = subprocess.run(
                [path, "ado", "token", "--mode", "iwa",
                 "--domain", "microsoft.com", "--output", "token"],
                capture_output=True, text=True, timeout=30
            )
            token = result.stdout.strip()
            if token:
                _token_cache = token
                return token
        except Exception:
            pass

    # Fallback — ask for PAT
    console.print("[yellow]AzureAuth not available or failed. Falling back to PAT.[/yellow]")
    token = Prompt.ask("  Enter your ADO Personal Access Token", password=True)
    _token_cache = token
    return token


def clear_cache():
    global _token_cache
    _token_cache = None
