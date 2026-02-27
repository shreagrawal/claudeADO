"""
LLM Parser — uses Claude to convert free-form text into a
structured Feature → PBI → Task hierarchy (JSON).
"""
import os
import json
import anthropic
from rich.console import Console
from rich.prompt import Prompt

console = Console()

SYSTEM_PROMPT = """You are an expert project manager and ADO (Azure DevOps) work item specialist.

Your job is to analyze unstructured text describing a software project plan and convert it into a structured hierarchy of ADO work items:
  - One Feature (top-level grouping)
  - Multiple Product Backlog Items (PBIs) under the Feature
  - Multiple Tasks under each PBI

Rules:
1. Every PBI must have at least one Task.
2. Task effort should be estimated in days (integer, 1–10).
3. Titles must be concise and actionable.
4. Descriptions should be 1–2 sentences summarizing the goal.
5. Group related work logically — avoid over-fragmenting or under-fragmenting.
6. Preserve phase labels (Phase 1 / Phase 2) in titles when present.

Return ONLY a valid JSON object with this exact structure — no commentary, no markdown fences:
{
  "feature": {
    "title": "<feature title>",
    "description": "<1-2 sentence description>"
  },
  "pbis": [
    {
      "title": "<PBI title>",
      "description": "<1-2 sentence description>",
      "tasks": [
        { "title": "<task title>", "effort": <days as integer> },
        ...
      ]
    },
    ...
  ]
}"""


def parse_text_to_hierarchy(text: str, api_key: str) -> dict | None:
    """Send text to Claude and get back a structured hierarchy dict."""
    client = anthropic.Anthropic(api_key=api_key)

    console.print("\n[cyan]Sending to Claude for analysis...[/cyan]")
    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8096,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Convert the following project plan into ADO work items:\n\n{text}"
                }
            ]
        )

        raw = message.content[0].text.strip()

        # Strip markdown fences if Claude wraps it anyway
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        hierarchy = json.loads(raw)
        return hierarchy

    except json.JSONDecodeError as e:
        console.print(f"[red]Failed to parse Claude response as JSON: {e}[/red]")
        console.print(f"[dim]Raw response: {raw[:500]}[/dim]")
        return None
    except Exception as e:
        console.print(f"[red]Claude API error: {e}[/red]")
        return None


def get_api_key() -> str:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        key = Prompt.ask("  Enter your Anthropic API key", password=True)
    return key
