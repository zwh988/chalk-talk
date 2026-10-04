# Chalk Talk
9-ball logging and training PWA. Local-first (IndexedDB), syncs to a private GitHub repo.

## Deploy (once)
1. Create a **public** repo `chalk-talk`, upload everything in this folder, push to `main`.
2. Repo Settings → Pages → Source: **GitHub Actions**. The site appears at `https://<you>.github.io/chalk-talk/`.
3. Create a **private** repo `chalk-talk-data` (tick "Add a README" so it isn't empty).
4. Settings → Developer settings → Fine-grained tokens: access to **only** `chalk-talk-data`, permission **Contents: Read and write**.
5. Open the site on your phone → Add to Home Screen. Sync tab: enter `you/chalk-talk-data` and the token.
   Your friend does step 4 with their own token and the same repo (add them as a collaborator).

## Local dev
`npm install && npm run dev`
