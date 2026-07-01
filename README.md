# v30 Whop PKCE Token Fix

Replace this file in GitHub:

api/auth/callback.js

Important:
If you also have callback.js in the root, replace that too or delete the root copy.

This fix removes client_secret from the Whop OAuth token exchange.
Then redeploy Vercel and test:

https://www.learnmasterai.com/api/auth/login
