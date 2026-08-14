"""
Loads a realistic mid-size company's automation stack into CognoDB:
teams, the third-party services they depend on, the workflows that stitch
them together, and the data objects that flow between workflows.

Run:
    python seed/seed_data.py

Reads NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD from .env (same as the API).
Safe to re-run: it wipes and reloads the demo dataset each time.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

URI = os.getenv("NEO4J_URI")
USER = os.getenv("NEO4J_USER", "cognodb")
PASSWORD = os.getenv("NEO4J_PASSWORD")

if not URI or not PASSWORD:
    sys.exit(
        "NEO4J_URI / NEO4J_PASSWORD not set. Copy backend/.env.example to "
        "backend/.env and fill in your CognoDB connection details first."
    )

TEAMS = [
    {"id": "team-growth", "name": "Growth"},
    {"id": "team-ops", "name": "Ops"},
    {"id": "team-finance", "name": "Finance"},
    {"id": "team-support", "name": "Support"},
]

SERVICES = [
    {"id": "svc-stripe", "name": "Stripe", "category": "Payments", "vendor": "Stripe Inc.", "status": "operational"},
    {"id": "svc-shopify", "name": "Shopify", "category": "Commerce", "vendor": "Shopify Inc.", "status": "operational"},
    {"id": "svc-sendgrid", "name": "SendGrid", "category": "Email", "vendor": "Twilio", "status": "operational"},
    {"id": "svc-twilio", "name": "Twilio SMS", "category": "Messaging", "vendor": "Twilio", "status": "operational"},
    {"id": "svc-slack", "name": "Slack", "category": "Internal comms", "vendor": "Salesforce", "status": "operational"},
    {"id": "svc-salesforce", "name": "Salesforce", "category": "CRM", "vendor": "Salesforce", "status": "operational"},
    {"id": "svc-hubspot", "name": "HubSpot", "category": "Marketing", "vendor": "HubSpot Inc.", "status": "operational"},
    {"id": "svc-zendesk", "name": "Zendesk", "category": "Support desk", "vendor": "Zendesk Inc.", "status": "operational"},
    {"id": "svc-quickbooks", "name": "QuickBooks", "category": "Accounting", "vendor": "Intuit", "status": "operational"},
    {"id": "svc-sheets", "name": "Google Sheets", "category": "Reporting", "vendor": "Google", "status": "operational"},
    {"id": "svc-s3", "name": "AWS S3", "category": "Storage", "vendor": "Amazon", "status": "operational"},
    {"id": "svc-internal-db", "name": "Internal Postgres", "category": "Database", "vendor": "In-house", "status": "operational"},
]

DATA_OBJECTS = [
    {"id": "data-order", "name": "Order record"},
    {"id": "data-invoice", "name": "Invoice"},
    {"id": "data-lead", "name": "Lead"},
    {"id": "data-refund", "name": "Refund record"},
]

WORKFLOWS = [
    {"id": "wf-order-sync", "name": "New Order Sync", "team": "team-ops", "platform": "n8n",
     "status": "active", "criticality": "critical",
     "description": "Pulls new orders from Shopify, charges via Stripe, writes the order record.",
     "depends_on": ["svc-shopify", "svc-stripe"], "produces": ["data-order"]},

    {"id": "wf-invoice-gen", "name": "Invoice Generation", "team": "team-finance", "platform": "n8n",
     "status": "active", "criticality": "critical",
     "description": "Generates an invoice in QuickBooks for every new order.",
     "depends_on": ["svc-quickbooks"], "consumes": ["data-order"], "produces": ["data-invoice"],
     "triggers": ["wf-order-sync"]},

    {"id": "wf-payment-email", "name": "Payment Confirmation Email", "team": "team-support", "platform": "Zapier",
     "status": "active", "criticality": "high",
     "description": "Emails the customer their invoice via SendGrid.",
     "depends_on": ["svc-sendgrid"], "consumes": ["data-invoice"],
     "triggers": ["wf-invoice-gen"]},

    {"id": "wf-csat-survey", "name": "Customer Satisfaction Survey", "team": "team-growth", "platform": "n8n",
     "status": "active", "criticality": "low",
     "description": "Sends a CSAT survey 48h after payment confirmation.",
     "depends_on": ["svc-sendgrid", "svc-twilio"],
     "triggers": ["wf-payment-email"]},

    {"id": "wf-refund", "name": "Refund Processing", "team": "team-finance", "platform": "n8n",
     "status": "active", "criticality": "critical",
     "description": "Issues Stripe refunds and reverses the QuickBooks invoice.",
     "depends_on": ["svc-stripe", "svc-quickbooks"], "produces": ["data-refund"]},

    {"id": "wf-refund-notify", "name": "Refund Notification", "team": "team-support", "platform": "Zapier",
     "status": "active", "criticality": "medium",
     "description": "Notifies the customer and #support-refunds in Slack.",
     "depends_on": ["svc-sendgrid", "svc-slack"], "consumes": ["data-refund"],
     "triggers": ["wf-refund"]},

    {"id": "wf-failed-payment-retry", "name": "Failed Payment Retry", "team": "team-finance", "platform": "n8n",
     "status": "active", "criticality": "high",
     "description": "Retries failed Stripe charges on a dunning schedule.",
     "depends_on": ["svc-stripe"]},

    {"id": "wf-dunning-email", "name": "Dunning Email", "team": "team-finance", "platform": "n8n",
     "status": "active", "criticality": "medium",
     "description": "Emails customers about a failed payment needing action.",
     "depends_on": ["svc-sendgrid"],
     "triggers": ["wf-failed-payment-retry"]},

    {"id": "wf-lead-capture", "name": "Lead Capture", "team": "team-growth", "platform": "Make",
     "status": "active", "criticality": "high",
     "description": "Captures form leads into HubSpot and pings #sales-leads.",
     "depends_on": ["svc-hubspot", "svc-slack"], "produces": ["data-lead"]},

    {"id": "wf-lead-scoring", "name": "Lead Scoring", "team": "team-growth", "platform": "Make",
     "status": "active", "criticality": "medium",
     "description": "Scores each lead in Salesforce based on firmographic data.",
     "depends_on": ["svc-salesforce"], "consumes": ["data-lead"],
     "triggers": ["wf-lead-capture"]},

    {"id": "wf-sales-notify", "name": "Sales Notification", "team": "team-growth", "platform": "Make",
     "status": "active", "criticality": "low",
     "description": "Notifies the assigned rep in Slack for high-score leads.",
     "depends_on": ["svc-slack"],
     "triggers": ["wf-lead-scoring"]},

    {"id": "wf-abandoned-cart", "name": "Abandoned Cart Reminder", "team": "team-growth", "platform": "Zapier",
     "status": "active", "criticality": "medium",
     "description": "Emails customers who left items in a Shopify cart.",
     "depends_on": ["svc-shopify", "svc-sendgrid"]},

    {"id": "wf-support-routing", "name": "Support Ticket Routing", "team": "team-support", "platform": "n8n",
     "status": "active", "criticality": "high",
     "description": "Routes new Zendesk tickets to the right queue and Slack channel.",
     "depends_on": ["svc-zendesk", "svc-slack"]},

    {"id": "wf-revenue-report", "name": "Weekly Revenue Report", "team": "team-finance", "platform": "n8n",
     "status": "active", "criticality": "low",
     "description": "Rolls up QuickBooks revenue into a shared Google Sheet.",
     "depends_on": ["svc-quickbooks", "svc-sheets"]},

    {"id": "wf-inventory-sync", "name": "Inventory Sync", "team": "team-ops", "platform": "n8n",
     "status": "active", "criticality": "high",
     "description": "Syncs Shopify stock counts with the S3-backed warehouse feed.",
     "depends_on": ["svc-shopify", "svc-s3"]},

    {"id": "wf-onboarding", "name": "New Signup Onboarding", "team": "team-growth", "platform": "n8n",
     "status": "active", "criticality": "medium",
     "description": "Sends the welcome sequence to new HubSpot signups.",
     "depends_on": ["svc-hubspot", "svc-sendgrid"]},

    {"id": "wf-welcome-survey", "name": "Welcome Survey", "team": "team-growth", "platform": "n8n",
     "status": "active", "criticality": "low",
     "description": "Texts a short welcome survey 7 days after signup.",
     "depends_on": ["svc-twilio"],
     "triggers": ["wf-onboarding"]},

    {"id": "wf-churn-alert", "name": "Churn Risk Alert", "team": "team-growth", "platform": "Make",
     "status": "active", "criticality": "medium",
     "description": "Flags at-risk accounts in Salesforce and alerts #customer-success.",
     "depends_on": ["svc-salesforce", "svc-slack"]},

    {"id": "wf-nightly-backup", "name": "Nightly Backup Job", "team": "team-ops", "platform": "n8n",
     "status": "active", "criticality": "critical",
     "description": "Backs up the internal Postgres DB to S3 every night.",
     "depends_on": ["svc-internal-db", "svc-s3"]},
]


def main():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        print("Wiping existing demo data...")
        session.run("MATCH (n) DETACH DELETE n")

        print(f"Loading {len(TEAMS)} teams...")
        for t in TEAMS:
            session.run("CREATE (:Team {id: $id, name: $name})", t)

        print(f"Loading {len(SERVICES)} services...")
        for s in SERVICES:
            session.run(
                "CREATE (:Service {id: $id, name: $name, category: $category, "
                "vendor: $vendor, status: $status})",
                s,
            )

        print(f"Loading {len(DATA_OBJECTS)} data objects...")
        for d in DATA_OBJECTS:
            session.run("CREATE (:DataObject {id: $id, name: $name})", d)

        print(f"Loading {len(WORKFLOWS)} workflows and their relationships...")
        for w in WORKFLOWS:
            session.run(
                "CREATE (:Workflow {id: $id, name: $name, platform: $platform, "
                "status: $status, criticality: $criticality, description: $description})",
                {k: w[k] for k in ("id", "name", "platform", "status", "criticality", "description")},
            )

        for w in WORKFLOWS:
            session.run(
                "MATCH (t:Team {id: $team}), (w:Workflow {id: $wf}) CREATE (t)-[:OWNS]->(w)",
                {"team": w["team"], "wf": w["id"]},
            )
            for svc in w.get("depends_on", []):
                session.run(
                    "MATCH (w:Workflow {id: $wf}), (s:Service {id: $svc}) CREATE (w)-[:DEPENDS_ON]->(s)",
                    {"wf": w["id"], "svc": svc},
                )
            for parent in w.get("triggers", []):
                session.run(
                    "MATCH (parent:Workflow {id: $parent}), (child:Workflow {id: $child}) "
                    "CREATE (parent)-[:TRIGGERS]->(child)",
                    {"parent": parent, "child": w["id"]},
                )
            for obj in w.get("consumes", []):
                session.run(
                    "MATCH (w:Workflow {id: $wf}), (d:DataObject {id: $obj}) CREATE (w)-[:CONSUMES]->(d)",
                    {"wf": w["id"], "obj": obj},
                )
            for obj in w.get("produces", []):
                session.run(
                    "MATCH (w:Workflow {id: $wf}), (d:DataObject {id: $obj}) CREATE (w)-[:PRODUCES]->(d)",
                    {"wf": w["id"], "obj": obj},
                )

        print("Done. Try simulating an outage on Stripe or SendGrid — both fan out into multi-step cascades.")

    driver.close()


if __name__ == "__main__":
    main()
