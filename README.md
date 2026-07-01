# Master AI Academy v27 — PRO Whop OAuth Access Lock

This replaces the old secret-link MVP system with real Whop login + server-side access checks.

## What this does

- `/academy.html` is protected before it loads.
- User must sign in with Whop.
- Server checks if the Whop user has active access to:
  `prod_NPCqN5YPeTBXa`
- If subscription is canceled/expired/no access -> redirect to `/paywall.html`.
- No `access.html?key=...` master link anymore.

## Why this is the right system

Whop OAuth sends users through a real Whop login/consent flow. Whop documents OAuth endpoints under `https://api.whop.com/oauth/`, and the returned token can identify the user. Whop's check access endpoint verifies whether a user has access to a product/resource.

## Upload to GitHub root

Upload everything in this folder:

- `index.html`
- `academy.html`
- `paywall.html`
- `logo.svg`
- `favicon.svg`
- `robots.txt`
- `sitemap.xml`
- `vercel.json`
- `middleware.js`
- `api/auth/login.js`
- `api/auth/callback.js`
- `api/auth/status.js`
- `api/auth/logout.js`

## Vercel Environment Variables

In Vercel:
Project -> Settings -> Environment Variables

Add:

WHOP_PRODUCT_ID = prod_NPCqN5YPeTBXa
WHOP_CLIENT_ID = your app_xxx
WHOP_CLIENT_SECRET = your client secret
WHOP_API_KEY = your Whop API key
WHOP_SESSION_SECRET = long random secret
WHOP_REDIRECT_URI = https://www.learnmasterai.com/api/auth/callback

Optional:
WHOP_COMPANY_ID = biz_xxx
WHOP_API_BASE = https://api.whop.com/api/v1
WHOP_API_VERSION = 2026-07-01

## Whop OAuth app

In Whop Developer Dashboard, OAuth Redirect URI must be exactly:

https://www.learnmasterai.com/api/auth/callback

## Whop checkout redirect

Set After Checkout redirect to:

https://www.learnmasterai.com/api/auth/login

This means after payment, user signs in/continues with Whop, then lands in academy only if active.

## Tests after deploy

1. Open direct:
https://www.learnmasterai.com/academy.html

Expected: paywall/login page.

2. Click:
https://www.learnmasterai.com/api/auth/login

Expected: Whop login/authorize, then academy if active.

3. Check API session:
https://www.learnmasterai.com/api/auth/status

Expected: JSON with access true/false.

## Important

Do not paste API key or client secret into GitHub/HTML.
Only Vercel Environment Variables.


## v28 Fix

This version fixes `MIDDLEWARE_INVOCATION_FAILED` by using `NextResponse` and wrapping middleware logic in safe try/catch redirects.

After upload/redeploy, test:

https://www.learnmasterai.com/api/auth/debug

Expected:
All required env values should be true.

Then:
https://www.learnmasterai.com/academy.html?v=28

Expected:
Paywall, not 500.


## v29 Fix

This version removes `import { NextResponse } from "next/server"` from `middleware.js`.

Use this for a static Vercel HTML project.

Upload at least:

- middleware.js
- vercel.json
- api/auth/debug.js

Then redeploy.

Test:

https://www.learnmasterai.com/api/auth/debug

Then:

https://www.learnmasterai.com/academy.html?v=29

Expected: paywall, not 500.
