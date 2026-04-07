# Digital Twin Council – Multi-Expert Decision Agent

## The Pitch

**Problem:** Complex, cross-functional questions — implementation risk, solution design, deal strategy — require input from multiple experts. Today, we ping them one-by-one, get siloed answers, and manually reconcile conflicting advice. It's slow, inconsistent, and doesn't scale.

**Solution:** A web app that sits on top of Digital Twin's existing APIs. You type a question, and the app analyzes it to automatically recommend which twins should be on the "council" based on topic and expertise. Before anything runs, you see the proposed council — add, remove, or swap members — and confirm. Once approved, the orchestrator fans out the query to each twin in parallel, collects structured responses, runs a weighted vote to surface consensus and disagreement, and delivers a clear primary recommendation, top alternatives, and a concise executive summary. Start as a lightweight web app, then extend to Slack, in-DT panels, and deeper integrations as adoption grows.

---

## Digital Twin APIs (What Makes This Possible)

- **MCP / SSE endpoint** – Digital Twin can be accessed as an MCP server via an SSE endpoint with an `API_ACCESS_TOKEN`. Exposes tools/bots programmatically.
- **Bots listing API** – Lists all bots/twins the user has access to (discovery + council assembly).
- **Document Adapter API** – `/api/v1/bot/{bot_enc_id}/documents/search-with-download` — search a bot's documents and get presigned URLs for underlying content.

Together: (1) discover which twins exist, (2) programmatically query them, (3) pull supporting evidence.

---

## How It Works

### 1. Type a Question

User enters a question in the web app (e.g., "What's the implementation risk for Kraft Heinz?").

### 2. Smart Council Recommendation

The app analyzes the question and auto-recommends a council based on topic and expertise (e.g., EM Twin, SA Twin, Config Twin, CX Twin). Uses the bots listing API + metadata/tags to match.

### 3. Review & Adjust the Council

Before execution, the user sees the proposed council and can:
- **Add** twins they want included
- **Remove** twins that aren't relevant
- **Swap** members or use a saved council template

### 4. Fan Out in Parallel

The orchestrator sends the question to each twin simultaneously via MCP tools or per-bot HTTP endpoints. Each twin can be given a perspective prompt (e.g., "Answer as the Config expert, focus only on config/guardrails…").

### 5. Normalize Responses

Each twin's answer is structured into a standard schema:

| Field | Description |
|---|---|
| `position` | Recommendation |
| `rationale` | Supporting bullets |
| `assumptions` | Key assumptions made |
| `confidence_score` | Self-assessed confidence |
| `key_evidence` | Links / doc IDs from DT's document adapter API |

### 6. Vote & Synthesize

An aggregator agent detects consensus vs. disagreement, computes a weighted vote (by role, confidence, recency), and produces:
- **Primary recommendation** — the council majority view
- **Top 1–2 alternatives** — where a minority twin disagrees, with rationale
- **Executive summary** — what the council agrees on, what's contested

---

## Slack Integration (Phase 2)

Once the web app is established, Slack becomes a lightweight trigger and delivery surface:

1. **Slash command** — `/council "What's the implementation risk for Kraft Heinz?"` in any channel.
2. **Council preview** — The bot replies with an ephemeral message showing the auto-recommended council with buttons to add/remove members and a "Run Council" button — same approval step as the web app, just inside Slack.
3. **Execution** — Once confirmed, the orchestrator fans out to the twins. The bot posts a "thinking..." status.
4. **Threaded results** — The final answer comes back as a structured Slack message in-thread:
   - **Council Recommendation** (majority vote)
   - **Alternatives** (dissenting views, collapsed)
   - **Executive Summary** (one-paragraph synthesis)
   - **"View Full Report"** link back to the web app for the detailed breakdown
5. **Channel context** — The answer lives where the conversation is happening. Teammates can see it, react, reply, or re-run with a different council — no context-switching.

**Why Slack works:** It's already where cross-functional decisions get discussed. The bot pattern is familiar. The web app remains the source of truth for full history, detailed responses, and council management — Slack is just a quick-ask interface that links back.

---

## Build Path

| Phase | What | Where |
|---|---|---|
| **Phase 1** | Web app — full experience: question input, smart council recommendation, council review/edit, parallel execution, vote + synthesis, history | Web |
| **Phase 2** | Slack bot — slash command trigger, ephemeral council preview, threaded results, link back to web app | Slack |
| **Phase 3** | In-DT panel — "Council View" embedded in the Digital Twin interface, council templates, deeper API integration | Digital Twin |

---

## Spreadsheet Submission

**Idea Title:** Digital Twin Council – Multi-Expert Decision Agent

**High-Level Summary:** A web app that lets users assemble a council of Digital Twins (by person, role, or template), pose a question once, and automatically aggregates, reconciles, and "votes" on their answers to produce a clear recommendation, alternatives, and a concise summary. Extends to Slack and in-DT panels over time.

**Problem:** For complex, cross-functional decisions (implementation design, project risk, expansion strategy), we currently ask multiple experts one-by-one, then manually reconcile conflicting advice. This is slow, inconsistent, and doesn't scale.

**Solution:**
1. Discovers eligible twins via existing Digital Twin APIs.
2. Analyzes the question and auto-recommends a council; user reviews and adjusts before execution.
3. Fans out the question to all twins in parallel, collects structured answers, and runs a vote + synthesis pass.
4. Returns a majority recommendation, notable minority views, and a short executive summary for quick action.

**Impact:**
- Faster, higher-quality decisions for implementations and CX.
- Re-uses existing Digital Twin infra and APIs; adds a thin orchestration + UI layer.
- Creates a reusable pattern for ensemble AI decision-making across Eightfold.

**Tools/Solutions:** Digital Twin (Ask + bot APIs / MCP), Glean / Gemini for aggregation and synthesis, Slack for delivery.

---

## Why This is Differentiated

- **Technically credible** — uses real, existing DT APIs (MCP, bots listing, document adapter).
- **DT-centric** — builds on top of Digital Twin rather than replacing it.
- **User stays in control** — smart recommendations with human review before execution.
- **Distinct from existing sheet ideas** — no one else has proposed multi-twin orchestration with voting/synthesis.
- **Reusable pattern** — the "ensemble agent" approach generalizes beyond any single use case.
