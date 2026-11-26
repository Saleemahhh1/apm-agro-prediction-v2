# APM-Agro API

Node.js + Express + MongoDB backend for APM-Agro email accounts.

## Local setup

1. Use Node.js 20 or newer.
2. From this directory run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `MONGODB_URI`, a random `JWT_SECRET` (32+ characters), `CLIENT_URL`, `API_PUBLIC_URL`, and Resend values.
5. Verify the sending domain in Resend and set `EMAIL_FROM` to an address on that verified domain.
6. Run `npm run dev`.

Never commit `.env`, database credentials, JWT secrets, or email API keys. Keep MongoDB network access restricted; do not use 0.0.0.0/0 for production.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register` — fullName, email, phoneNumber, country, state, postalCode, password
- `GET /api/auth/verify-email?token=...` — browser confirmation link
- `POST /api/auth/login` — email, password; sets an HttpOnly session cookie
- `POST /api/auth/forgot-password` — email
- `POST /api/auth/reset-password` — token, password
- `GET /api/auth/me` — current verified account
- `POST /api/auth/logout`

Registration requires email confirmation before login. Verification and reset tokens are random, single-use, stored as SHA-256 hashes, and expire. Passwords are hashed with bcrypt. Authentication uses an HttpOnly cookie rather than localStorage.

## Deployment environment

Set the same variables in the backend hosting provider. `API_PUBLIC_URL` must be the public API origin (for example, your Render service URL); `CLIENT_URL` must be the exact frontend origin. Set `NODE_ENV=production` in production.
