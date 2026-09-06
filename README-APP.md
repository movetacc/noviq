# NOVIQ Living Enterprise City v8.0

NOVIQ is a local-first AI business operating system: CEO strategy → managers → workers → tasks → actions → revenue → customers → fulfillment → learning.

## What v8 adds

- **Agent Academy — Skill Matrix:** every worker agent's curriculum skills (set at birth from its department) now carry a live 0-100 proficiency score. Each completed task nudges every listed skill.
- **World Intelligence — Trend Engine:** a scheduled scan (`NOVIQ_INTELLIGENCE_HOURS`, default every 6h, or trigger on demand) asks the model what a well-informed operator would currently know or care about.
- **New API surface:** `GET /api/academy`, `GET /api/academy/:agentId`, `GET /api/intelligence`, `POST /api/intelligence/scan`.
- **Dashboard panels:** a Skill Matrix view (progress bars per skill, per agent, with rank) and a World Intelligence feed with a manual "Scan Trends Now" button.
- Everything from v7 (Discord command center) and v6 (production reliability, sales reaction, customer lifecycle, fulfillment/booking bridges) is retained unchanged, just rebranded to NOVIQ.

## Setup

Requirements: Node.js 20+ and Windows/macOS/Linux.

```bash
npm install
npm run hash-password -- "YOUR_PASSWORD"
```

Copy `.env.example` to `.env`, paste the Argon2 hash into `NOVIQ_OWNER_PASSWORD_HASH`, then add your provider credentials.