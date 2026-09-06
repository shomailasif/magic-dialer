# AutoDial Management System

Free (no paid services). Built only on Node.js built-ins — no installs required.

A system that lets you sell an AI-selling-agent product to customers: each
customer installs a small program on their PC, and you (the admin) watch every
PC live and can disable any customer remotely when they don't pay.

## What it does (all built & tested & PASSING)

| Piece | What it does |
|---|---|
| **Admin portal (web app)** | Shows each customer PC online/offline, recent AI calls, email outbox, and Disable/Enable buttons. **Password-protected** so only the admin can manage it. Runs anywhere (free cloud). |
| **Customer PC agent** | Installed on each customer's PC. Sends heartbeats, obeys disable, runs the setup form. |
| **Setup form** | At install, the customer tells the agent what they sell / what lead info they need / where to email leads. |
| **AI sales conversation** | Talks to a lead (speak + hear), asks the qualifying questions, keeps a friendly high-energy tone. |
| **Lead qualification** | Decides if the lead is good (per what the customer needs). |
| **Escalate to human** | Only as a last resort (e.g. the lead asks for a real person). |
| **Incoming calls & texts** | Handler ready for when a customer/text reaches out. |
| **AI learning** | Scores its techniques per call — improves over time. |
| **Lead email** | Emails good leads to the customer's address (or records them to an outbox if no email account is set). |
| **Remote disable** | You click Disable; the customer's PC stops working on its next heartbeat. |

## Files

```
management/
  portal/
    server.js   admin cloud portal (HTTP server + dashboard)
    db.js       portal database (SQLite, built-in)
    mailer.js   lead emails (SMTP or local outbox)
  agent/
    agent.js    customer PC program (heartbeat + disable + setup)
    voice.js    SPEAKS out loud (free Windows voice)
    hear.js     HEARS speech to text (free Windows recognition)
    brain.js    AI sales brain (conversation, scoring, learning)
    call-runner.js ties brain + voice + hearing into a call
    inbound.js  incoming calls & texts
  shared/
    protocol.js heartbeat interval + response format
  build/
    bundle.js      bundles the agent into one file (esbuild, free)
    installer.iss  the Inno Setup installer script
    BUILD.md       how to make the customer .exe installer (free)
  *.js            demos and tests (all PASS)
```

## Run the demos / tests

```
node demo.js                    # portal + 2 customer PCs + remote disable  -> PASS
node call-flow-test.js          # AI call, qualification, escalation, email -> PASS
node test-inbound-learning.js   # incoming calls/texts + AI learning        -> PASS
node speak-test.js              # HEAR the friendly female agent speak
node conversation-test.js       # agent SPEAKS, then LISTENS, then replies
```

## Deploy to a free cloud (you do this once, when ready)

The portal is a plain Node HTTP server (`portal/server.js`) that uses ONLY
Node built-ins (`node:http`, `node:crypto`, `node:sqlite`) — **no npm install,
no build step**. This makes it drop-in for any free Node host. The only env vars
you set are the admin password and (optionally) a secret.

### Option A — Render (easiest, recommended)
1. Create a free account at render.com.
2. "New → Web Service", connect your GitHub/GitLab repo containing this repo
   (or use "Public Git Repository" with your repo URL).
3. Settings:
   - **Root Directory**: `src/management`
   - **Build Command**: leave empty (`npm install` will find no deps — fast)
   - **Start Command**: `node portal/server.js`
   - **Environment** (add these):
     - `ADM_PASSWORD` = your strong admin password
     - `ADM_SECRET` = any long random string (keeps admin sessions valid across restarts)
     - `PORT` — Render injects this automatically (server already honors it)
4. Deploy. You get a public URL like `https://your-app.onrender.com`.
5. Open it — you'll see the **Admin Login** page. Sign in with `ADM_PASSWORD`.

Give each customer that public URL as their `portalUrl`.

### Option B — Railway
1. Create a free railway.app account, "New Project → Deploy from repo".
2. Service settings → Start command: `node portal/server.js`
3. Add `ADM_PASSWORD` and `ADM_SECRET` variables. Deploy. Use the generated URL.

### Option C — Fly.io
```
fly launch --no-deploy
fly secrets set ADM_PASSWORD=... ADM_SECRET=...
fly deploy
```

> **Email**: In the free cloud, SMTP emails work only if you set `SMTP_HOST`,
> `SMTP_USER`, `SMTP_PASS` (e.g. a Gmail app-password). Without SMTP the portal
> records leads to an on-server `outbox/` (ephemeral — lost on restart), so for
> production set SMTP or the customer's lead email account.

**Note**: the agent's own endpoints (`/api/heartbeat`, `/api/call-result`) stay
open so each customer's PC can report and post call results WITHOUT logging in.
Only humans must sign in (to the dashboard / disable / manage).

## Honest limits

- **Real calls** are the one deferred step: they need each customer's **VOIP**
  line connected (see the two "VERY END" todos). The agent can already speak
  and hear; the phone line is separate.
- **Voice**: `agent/voice.js` now uses free **neural** voices — Microsoft Edge
  (`edge-tts`, human-sounding, 140+ languages; needs internet + Python 3 +
  `pip install edge-tts`) with a local **HeadTTS/Kokoro** fallback (offline,
  human) and Windows as a last resort. See the voice module for details.
