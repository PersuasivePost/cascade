"""
Turns a blast-radius traversal result into a plain-English incident summary.

Uses the Gemini API when GEMINI_API_KEY / GOOGLE_API_KEY is set. Falls back to a
template-based summary otherwise, so the app is fully functional without
an API key — the graph traversal is the product; the AI layer is a
readability layer on top of it.
"""
from app.config import get_settings

def _template_summary(service_name: str, affected: list[dict], longest_chain: dict | None) -> str:
    if not affected:
        return f"No workflows currently depend on {service_name}. An outage here would have no downstream impact."

    team_names = sorted({t for row in affected for t in row.get("teams", []) if t})
    critical = [row for row in affected if row.get("criticality") == "critical"]
    max_hops = max(row.get("hopsFromFailure", 0) for row in affected)

    parts = [
        f"An outage in {service_name} would affect {len(affected)} workflow"
        f"{'s' if len(affected) != 1 else ''} across {len(team_names)} team"
        f"{'s' if len(team_names) != 1 else ''} ({', '.join(team_names)})."
    ]
    if critical:
        parts.append(
            f"{len(critical)} of those are marked critical, so impact starts immediately, not just downstream."
        )
    if max_hops > 0:
        parts.append(
            f"The failure cascades up to {max_hops} step{'s' if max_hops != 1 else ''} deep through chained workflows."
        )
    if longest_chain and longest_chain.get("chainLength", 0) > 0:
        parts.append("Longest chain: " + " → ".join(longest_chain["chain"]) + ".")
    return " ".join(parts)


def generate_incident_summary(
    service_name: str,
    affected: list[dict],
    longest_chain: dict | None,
) -> str:
    settings = get_settings()
    template = _template_summary(service_name, affected, longest_chain)

    api_key = settings.effective_gemini_api_key
    if not api_key:
        return template

    try:
        chain_text = " -> ".join(longest_chain["chain"]) if longest_chain and longest_chain.get("chain") else "none"
        prompt = (
            f"Service down: {service_name}\n"
            f"Directly/transitively affected workflows (name, criticality, hops, owning teams): "
            f"{[(a['workflowName'], a['criticality'], a['hopsFromFailure'], a.get('teams', [])) for a in affected]}\n"
            f"Longest cascade chain: {chain_text}\n\n"
            "Write a 2-3 sentence incident-impact summary for an on-call engineer, in plain English. "
            "Lead with the scale of the blast radius, name the teams affected, and flag anything critical. "
            "No preamble, no markdown, just the summary text."
        )

        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = (response.text or "").strip()
            if text:
                return text
        except ImportError:
            pass

        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=api_key)
        model = genai_legacy.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = (response.text or "").strip()
        return text or template
    except Exception:
        # Never let an AI-layer hiccup break the core feature — degrade gracefully to template
        return template
