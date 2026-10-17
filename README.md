# SubPulse – Subscription Management Dashboard

A full-stack, enterprise-grade Subscription Management Dashboard built with Role-Based Access Control (RBAC), modern UI/UX design, dark & light theme support, and device-responsive layouts.

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 with Vite & TypeScript
- **Styling:** Tailwind CSS (Dark/Light mode support, curated color system, custom scrollbars)
- **State Management:** Redux Toolkit & React-Redux
- **Routing:** React Router v7
- **Icons:** Lucide React

### Backend (Next Phase)
- **Runtime:** Node.js & Express.js with TypeScript
- **Database:** MongoDB with Mongoose
- **Authentication:** Access Tokens & Refresh Tokens (JWT) with RBAC
- **Validation:** Joi schema validation

---

## 📱 Implemented Frontend Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/plans` | **Plans & Pricing** | • **User View:** Available plans (Starter, Pro, Enterprise), monthly/annual toggle with 20% discount badge, feature comparison matrix, and FAQs.<br/>• **Admin View (Redesigned):** Dedicated **Plans & Pricing Management** enterprise dashboard with KPI cards, "+ Create New Plan" modal, search/filter toolbar, detailed configuration table, and 1-click soft-delete & restore. |
| `/dashboard` | **My Subscription** | User's active plan details, price, auto-renewal date, status badges, live resource usage meters (API calls, team seats, storage, projects), payment card details, and billing invoices table with PDF receipts. *(Hidden & disallowed for Admins)*. |
| `/admin/subscriptions` | **Customer Subscriptions** | Admin-exclusive directory of all customer subscription accounts with 4 KPI cards (MRR, Total Subscribers, Active Subscriptions, Churn Rate), search & filter toolbar, user registry data table, CSV export, and customer inspection/status override modal. |
| `/login` | **User Login** | Login form with email & password, show/hide password toggle, and **Instant Demo 1-Click Login** buttons for regular User and Admin. |
| `/register` | **User Registration** | Account creation with name, email, company, password confirmation, and 14-day free trial banner. |
| *Modal* | **Profile & Account Settings** | Accessible from avatar menu: personal details, workspace company, phone, password management, and role display. |

---

## 🎨 Theme & RBAC Role Switcher
- **Light / Dark Mode:** Toggle seamlessly from the sun/moon button in the top navigation bar with persistent local storage.
- **Instant RBAC Role Switcher:** A test button `Role: USER / ADMIN (switch)` is provided in the header to effortlessly test both regular user and admin-protected views without re-authenticating.

---

## 🛠️ Getting Started Locally

```bash
# Navigate to client directory
cd client

# Install dependencies (already installed)
npm install

# Start Vite Development Server
npm run dev
```

The application runs at: **`http://localhost:5173`**
