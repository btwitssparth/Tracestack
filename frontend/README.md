This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Authenticated FastAPI integration

The Next.js server proxies monitor-list requests to FastAPI and obtains the Supabase
access token from the server-managed session. The token is never returned to the browser.

Configure this server-only environment variable in `frontend/.env.local`:

```env
TRACESTACK_API_URL=http://127.0.0.1:8000
```

Use the deployed backend base URL for a deployed frontend. Do not add a
`NEXT_PUBLIC_` prefix to `TRACESTACK_API_URL`; it should remain server-only.

After restarting the Next.js dev server while signed in, open:

- `http://localhost:3000/api/monitors` — returns the signed-in user's monitors.
- `http://localhost:3000/api/auth-check` — diagnostic response showing whether FastAPI accepted the session, without exposing a token.

A successful empty monitor list (`200` with `[]`) means token validation and the protected endpoint succeeded. A `401` means the backend did not accept the session. A `503` from the monitor proxy usually means the backend URL is not configured or reachable.
