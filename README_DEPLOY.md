# Master AI Academy v20 — Vercel Audio Fix + Private Preview

What changed:

- Landing page no longer links free users directly to the full audio academy.
- Public preview is visual/curriculum only.
- Academy player still exists at `/academy.html` for private/student access.
- Audio paths are now absolute `/audio/filename.mp3`, which is safer on Vercel.
- Added `vercel.json` static config.

Deploy this ZIP to Vercel Drop to replace the current deployment.

After deploy, test privately:
- `https://yourdomain.com/academy.html`
- click Play lesson
- audio should load from `/audio/*.mp3`
