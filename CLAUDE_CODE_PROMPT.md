# TMB Command Center - Claude Code Setup Prompt

Copy and paste this entire block into Claude Code:

---

I have a Next.js project called TMB Command Center that needs to be initialized and deployed to Vercel. The project files are already created. Here's what I need you to do:

## 1. Initialize the project

```bash
cd tmb-command-center
npm install
```

## 2. Create the .env.local file

```bash
cp .env.example .env.local
```

Then I'll add my Anthropic API key to .env.local.

## 3. Test locally

```bash
npm run dev
```

This should start at http://localhost:3000

## 4. Initialize git and deploy to Vercel

```bash
git init
git add .
git commit -m "TMB Command Center v3 - initial deploy"
```

Then deploy with:
```bash
npx vercel
```

During Vercel setup, add the environment variable:
- ANTHROPIC_API_KEY = (my key)

## 5. Set up as PWA on iPhone

After deploying, open the Vercel URL in Safari on iPhone:
1. Tap the Share button
2. Tap "Add to Home Screen"
3. Name it "TMB Command"
4. It will run as a standalone app

## Project Structure

```
tmb-command-center/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.js      # Secure API proxy (API key stays server-side)
│   ├── layout.js              # Root layout with PWA meta tags
│   └── page.js                # Full app (Co-Pilot, Dialer, Pipeline, Tasks)
├── public/
│   └── manifest.json          # PWA manifest for home screen install
├── .env.example               # Template for API key
├── .env.local                 # Actual API key (gitignored)
├── .gitignore
├── next.config.js
└── package.json
```

## Architecture

- Frontend: React (Next.js App Router) with client-side state in localStorage
- AI: Claude Sonnet via /api/chat server route (API key never exposed to browser)
- Data: localStorage with GHL-aligned contact schema
- Pipelines: Sales (New Lead > Contacted > Engaged > Call Booked > Proposal Sent > Closed Won/Lost) and Fulfillment (Onboarding > In Progress > Waiting on Client > Review > Live)
- Cold Call Dialer: CSV import, card-stack calling, outcome tagging, auto lead creation, GHL CSV export

## What NOT to change

- The /api/chat/route.js proxy pattern (this is the security layer)
- The GHL field names in createGHLContact (these match GHL's import format)
- The pipeline stage names (these match Michael's actual GHL pipelines)

## Future enhancements to build

1. Generate PWA icons (icon-192.png and icon-512.png) for the /public folder
2. Add a settings page to change daily prospecting target
3. Add GHL API direct sync (OAuth flow, push contacts/opportunities)
4. Add SMS push reminders via GHL webhook
5. Add data export (full pipeline CSV, activity log CSV)
6. Add weekly prospecting report view
