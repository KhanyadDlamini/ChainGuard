# ChainGuard frontend

Next.js dashboard: overview, payments, investigations, evidence, connections.
See the root README for the full quickstart and `docs/demo-guide.md` for the
judge walkthrough.

```bash
npm install
npm run dev   # serves on http://127.0.0.1:3001
```

The browser calls the API directly at `http://127.0.0.1:8000` (overridable
via `NEXT_PUBLIC_API_ORIGIN`); server components use `API_ORIGIN`.
