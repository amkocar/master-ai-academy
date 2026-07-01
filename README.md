# Master AI Academy v25 — Best MVP Whop Gate

This is the best practical setup for the current static Vercel/GitHub site.

## Upload these files to GitHub root

- index.html
- academy.html
- access.html
- paywall.html
- robots.txt

Do not move your MP3 files.

## Change Whop checkout redirect

In Whop, set Checkout redirect to:

After checkout:
https://www.learnmasterai.com/access.html?key=maa_h9O7pNs09Mxe-ERwmDo3hbns99rcGQ53L_QOlwezkz0

## Flow

Public user:
learnmasterai.com -> Get Access -> Whop checkout -> after payment -> access.html -> academy.html

Direct shared academy link:
academy.html -> paywall.html

## Access behavior

- access is saved in browser localStorage
- access lasts 31 days
- after 31 days, the user must go through Whop/access again
- this blocks casual link sharing

## Important limitation

This is not full server-side authentication.
A user who shares the special access URL can still unlock another browser.
For first launch this is acceptable MVP protection.
Later upgrade should use Whop OAuth/API/webhooks.

## Test after Vercel deploy

1. Without access:
https://www.learnmasterai.com/academy.html?v=25

Expected: redirects to paywall.

2. Access grant:
https://www.learnmasterai.com/access.html?key=maa_h9O7pNs09Mxe-ERwmDo3hbns99rcGQ53L_QOlwezkz0

Expected: unlocks and redirects to academy.

3. Landing:
https://www.learnmasterai.com/?v=25

Expected: Get Access goes to Whop checkout:
https://whop.com/checkout/plan_jO0TvvuJFmOlT
