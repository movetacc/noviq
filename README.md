# NOVIQ Living Enterprise City v8.0

NOVIQ is a local-first AI business operating system: CEO strategy → managers → workers → tasks → actions → revenue → customers → fulfillment → learning.

## What v8 adds

- **Agent Academy — Skill Matrix:** every worker agent's curriculum skills (set at birth from its department) now carry a live 0-100 proficiency score. Each completed task nudges every listed skill up; each failed task nudges it down harder — no invented events, just real task outcomes feeding a real score. Agents automatically progress Rookie → Worker → Specialist → Senior as their overall score and task count grow, and each rank-up posts a certification entry to the Academy log.
- **World Intelligence — Trend Engine:** a scheduled scan (`NOVIQ_INTELLIGENCE_HOURS`, default every 6h, or trigger on demand) asks the model what a well-informed operator would currently know or reasonably infer about trends, tools, platforms, competitors, and opportunities relevant to each venture's departments. Signals are logged with an impact rating, and any signal flagged `skill_update_needed` drops a curriculum-update lesson into that department's agents' Academy queue automatically.
- **New API surface:** `GET /api/academy`, `GET /api/academy/:agentId`, `GET /api/intelligence`, `POST /api/intelligence/scan`.
- **Dashboard panels:** a Skill Matrix view (progress bars per skill, per agent, with rank) and a World Intelligence feed with a manual "Scan Trends Now" button.
- Everything from v7 (Discord command center) and v6 (production reliability, sales reaction, customer lifecycle, fulfillment/booking bridges) is retained unchanged, just rebranded to NOVIQ.

## Finish-line architecture

1. CEO reads the owner goal and campaign economics.
2. OpenRouter chooses a strategy and managers delegate tasks.
3. Places discovers businesses; Hunter enriches public professional contacts.
4. Sales Director chooses the cheapest profitable offer that has a reasonable chance of conversion.
5. Outreach sends rate-limited messages with opt-out language.
6. An inbound mail receiver/n8n/automation provider posts normalized replies to `/webhooks/inbound`.
7. NOVIQ classifies replies and can safely reply, stop, provide a payment link, or provide a booking link.
8. Square webhook records only completed/approved revenue.
9. A customer and fulfillment job are created after attributed payment.
10. Optional fulfillment webhook hands the job to the real service-delivery system.
11. KPIs feed back into Sales Director and CEO strategy.

## Setup

Requirements: Node.js 20+ and Windows/macOS/Linux.

```bash
npm install
npm run hash-password -- "YOUR_PASSWORD"
```

Copy `.env.example` to `.env`, paste the Argon2 hash into `NOVIQ_OWNER_PASSWORD_HASH`, then add your provider credentials.

For a safe first test:

- `NOVIQ_REQUIRE_APPROVAL_FOR_EXTERNAL_ACTIONS=true`
- `NOVIQ_ALLOW_AUTONOMOUS_PAYMENT_LINKS=false`
- `OUTREACH_DRY_RUN=true`
- use Square sandbox first

Only after testing should you move to production credentials and deliberately enable autonomous payment links.

## Important production requirements

The application cannot create uptime, DNS, HTTPS, sender reputation, provider approvals, or customer demand by itself. For real unattended operation, run it on an always-on host, expose `/webhooks/square` over public HTTPS, configure a verified sending domain/provider, connect your inbound email receiver to `/webhooks/inbound`, and connect your actual fulfillment workflow to `FULFILLMENT_WEBHOOK_URL`.

Do not use the system for deceptive impersonation, spam, or unsolicited messaging that violates applicable law/provider rules. Keep rate limits and opt-out handling enabled.

## Key endpoints

- `GET /api/health` — operational readiness
- `POST /api/money/start` — start the lead-to-sales task chain
- `POST /api/goals` — set the CEO goal
- `POST /webhooks/inbound` — normalized inbound reply bridge
- `POST /webhooks/booking` — normalized booking confirmation bridge
- `POST /webhooks/square` — verified Square payment webhook
- `GET /api/metrics` — revenue/sales/customer metrics
- `GET /api/academy` — every worker agent's skill matrix, overall score, and rank
- `GET /api/academy/:agentId` — one agent's full skill matrix + recent Academy lessons/certifications
- `GET /api/intelligence` — recent World Intelligence signals
- `POST /api/intelligence/scan` — trigger a World Intelligence scan on demand

## Security notes

The owner password should be stored as an Argon2id hash. Use TOTP in production. Keep `.env`, `data/noviq.sqlite`, and any master keys out of source control. Back up the SQLite database and logs. Review the audit log regularly.

## Discord Command Center (v7)

NOVIQ v7 can use Discord as the owner's live command center. It supports:

- Live notifications through a Discord webhook (payments, replies, bookings, failures, strategy, fulfillment, etc.).
- `/noviq <message>` slash command for natural-language owner commands and questions.
- `status`, `metrics`, `stop`, `resume`, `cycle`, and `goal <...>` commands.
- Owner-only command restriction with `DISCORD_OWNER_USER_ID`.
- Discord Ed25519 interaction-signature verification.
- High-impact actions remain inside NOVIQ's existing safety/approval gates; the Discord AI cannot invent arbitrary tools.

### Discord setup

1. Create a Discord application in the Discord Developer Portal.
2. Copy the application's **Public Key** to `DISCORD_PUBLIC_KEY`.
3. Copy the **Application ID** to `DISCORD_APPLICATION_ID`.
4. Create a bot token and put it in `DISCORD_BOT_TOKEN`. Keep it secret.
5. Create a Discord channel webhook and put its URL in `DISCORD_WEBHOOK_URL`. Optionally create a second alert webhook in `DISCORD_ALERT_WEBHOOK_URL`.
6. Put your Discord user ID in `DISCORD_OWNER_USER_ID` so only you can issue NOVIQ commands.
7. Deploy NOVIQ behind a public HTTPS URL and set `DISCORD_INTERACTION_URL=https://YOUR-DOMAIN/webhooks/discord`.
8. In the Discord Developer Portal, set the application's **Interactions Endpoint URL** to that same HTTPS URL.
9. Register the slash command from the NOVIQ folder:

```bash
npm run discord:register
```

10. Invite the application/bot to your server using the Discord OAuth2 URL generator with the `applications.commands` scope (and the bot scope if you want a bot user present in the server).

### Using it

In Discord:

```text
/noviq status
/noviq metrics
/noviq stop
/noviq resume
/noviq cycle
/noviq goal get 10 new HVAC customers this month while keeping CAC under $40
/noviq What are you working on right now?
/noviq Why haven't we made a sale yet?
```

The webhook notification channel will receive important live events automatically. NOVIQ intentionally does not expose arbitrary database, shell, credential, or unrestricted external-tool execution through Discord chat.
