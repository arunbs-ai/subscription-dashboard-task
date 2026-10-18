# ABS Nexora

A subscription management dashboard. Customers can browse plans, buy, upgrade or downgrade, manage payment cards, cancel at any time and download receipts. Admins manage plans and prices and see every customer subscription.

## Features

**Customer**
- Register and sign in (JWT access and refresh tokens, session kept after a page refresh)
- Browse active plans with monthly and yearly pricing and a live feature comparison
- Buy a plan, then upgrade or downgrade at any time. The new plan starts immediately and the old one is cancelled automatically
- Add, view, set default and remove payment cards (only the last 4 digits and expiry are stored)
- Cancel at period end or immediately, and reactivate before it ends
- Subscription history and billing history, with PDF receipt download
- Profile update and password change, with validation

**Admin**
- Plans & Prices Management: create, edit, view, publish or hide plans, and see the change history of each plan
- Customer Subscriptions: search, filter, view details and export to CSV

## Tech Stack

**Client** (`client/`)
- React 19, TypeScript, Vite
- Redux Toolkit and React Redux for state
- React Router 7
- Tailwind CSS 3 (light and dark theme, primary colour `#7C53FF`)
- lucide-react icons, jsPDF for PDF receipts

**Server** (`server/`)
- Node.js, Express 4, TypeScript (run with `tsx`)
- MongoDB with Mongoose
- JWT authentication and bcrypt password hashing, role based access (admin and user)
- Joi request validation
- Security: Helmet, CORS allow-list, rate limiting, request size limit, NoSQL injection and parameter pollution protection

## Project Structure

```
sub_dashboard/
  client/            React front end
    src/
      components/    Shared UI and layout
      pages/         Plans, dashboard, auth, admin pages
      store/         Redux slices
      services/      API layer
      utils/         Validation, text and PDF helpers
      config/        Reads values from client/.env
  server/            Express API
    src/
      config/        Reads values from server/.env
      controllers/   Request handlers
      middlewares/   Auth, validation, security, errors
      models/        Mongoose models
      routes/        API routes
      validations/   Joi schemas
      utils/         JWT helpers and database seed
```

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB running locally (or a MongoDB connection string)

## Setup

1. Install dependencies for both projects.

   ```bash
   cd server
   npm install

   cd ../client
   npm install
   ```

2. Create `server/.env`. Every value is required, the server stops at startup if one is missing.

   ```env
   PORT=3002
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   MONGODB_URI=mongodb://127.0.0.1:27017/subscription_dashboard

   JWT_ACCESS_SECRET=<long random string>
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=<a different long random string>
   JWT_REFRESH_EXPIRES_IN=7d

   ADMIN_NAME=System Administrator
   ADMIN_EMAIL=admin@subpulse.io
   ADMIN_PASSWORD=Admin@12345
   ADMIN_COMPANY=ABS Nexora HQ

   BODY_LIMIT=10kb
   TRUST_PROXY=0
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=300
   AUTH_RATE_LIMIT_MAX=10
   ```

   Generate each JWT secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. Create `client/.env`. Values starting with `VITE_` are visible in the browser, never put secrets here.

   ```env
   VITE_APP_NAME=ABS Nexora
   VITE_API_BASE_URL=http://localhost:3002/api
   VITE_STORAGE_PREFIX=subpulse
   ```

## Run

Start MongoDB, then run the two projects in separate terminals.

```bash
# Terminal 1: API on http://localhost:3002
cd server
npm run dev

# Terminal 2: web app on http://localhost:5173
cd client
npm run dev
```

On the first start the server creates the admin and user roles, the admin account from `server/.env`, and three starter plans (Starter, Professional, Enterprise). Open http://localhost:5173 and sign in with the admin email and password from `server/.env`, or register a new customer account.

Restart a dev server after changing its `.env` file.

## Scripts

| Where | Command | What it does |
|---|---|---|
| server | `npm run dev` | Start the API with auto reload |
| server | `npm run build` | Compile TypeScript to `dist/` |
| server | `npm start` | Run the compiled server |
| server | `npm run seed` | Run the database seed on its own |
| client | `npm run dev` | Start the web app |
| client | `npm run build` | Type check and create a production build |
| client | `npm run preview` | Preview the production build |
| client | `npm run lint` | Run the linter |

## API Overview

All routes are under `/api`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh-token`, `POST /auth/logout`, `GET /auth/me` |
| User | `GET/PUT /user/profile`, `PUT /user/change-password`, `GET /user/all` (admin) |
| Plans | `GET /plans`, admin routes under `/plans/admin` |
| Subscriptions | `GET /subscriptions/my`, `GET /subscriptions/history`, `POST /subscriptions/purchase`, `/cancel`, `/reactivate`, `GET /subscriptions/admin/subscribers` (admin) |
| Cards | `GET /cards/my`, `POST /cards`, `PATCH /cards/:id/default`, `DELETE /cards/:id` |
| Health | `GET /health` |

## Production Notes

- Set `NODE_ENV=production`, use new JWT secrets, and set `CLIENT_URL` to the real web address.
- Set `TRUST_PROXY` to the number of reverse proxies in front of the API.
- Set `VITE_API_BASE_URL` to the real API address before running `npm run build` in the client.
- Change the seeded admin password after the first login.
- Never commit `.env` files.

## Author and Contact

- **Name:** Arun BS
- **Email:** bsarun3151@gmail.com
