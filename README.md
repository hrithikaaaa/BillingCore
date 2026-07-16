# SaaS Subscription Billing & Revenue Analytics Platform

An enterprise-grade, high-fidelity Full-Stack SaaS Subscription Billing and Revenue Analytics platform modeled after Stripe Billing and Vercel dashboards. 

This platform implements authentic JWT role authorization, secure cryptographic password hashes, real-time prorated upgrades, active sales tax (10% VAT) calculations, discount coupon validations, detailed MRR/ARR charts, audit trails, and beautiful responsive HTML-based printable invoices.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts (SaaS analytics, charts)
* **Backend:** Node.js, Express.js, TypeScript, JWT (JSON Web Tokens), Bcryptjs (password security)
* **Storage:** Persistent Schema-Validated JSON Database Engine (simulates MongoDB/Mongoose structures with thread-safe file serialization)
* **Build & Deploy:** Vite, Esbuild (Bundles full-stack Node backend for lightweight, fast-boot container execution), Docker, Docker-Compose, GitHub Actions CI

---

## 📐 Platform Architecture

The platform uses a unified, decoupled MVC architecture with the Express backend proxying and hosting the compiled React Single Page Application (SPA).

```
                      +-----------------------------------+
                      |         Web Client Portal         |
                      |  [React 19 / Tailwind / Recharts] |
                      +-----------------+-----------------+
                                        |
                               HTTP / HTTPS Requests
                               (Bearer JWT Authorized)
                                        |
                                        v
                      +-----------------+-----------------+
                      |     Express Gateway Middleware     |
                      |  [Rate Limit / CORS / JWT Auth]   |
                      +-----------------+-----------------+
                                        |
                                        v
                +-----------------------+-----------------------+
                |                                               |
                v                                               v
  +-------------+-------------+                   +-------------+-------------+
  |  Admin Controller Engine  |                   | Customer Billing Control  |
  |  - MRR/ARR Financials     |                   |  - Upgrade Proration Calc |
  |  - Coupon Generators      |                   |  - VAT Tax Calculations   |
  |  - Audit Log Sinks        |                   |  - Invoices & Notifications|
  +-------------+-------------+                   +-------------+-------------+
                |                                               |
                +-----------------------+-----------------------+
                                        |
                                 Schema Queries
                                        |
                                        v
                      +-----------------+-----------------+
                      |     Validated JSON dbStore Core   |
                      |  [Active Transactions & Logs]     |
                      +-----------------------------------+
```

---

## 🔑 Demo Access Accounts

To simplify testing in sandbox and preview environments, pre-calculated demo accounts are available on the login page:

* **Platform Administrator Account:**
  * **Email:** `admin@billing.com`
  * **Password:** `password123`
  * **Access:** Full control plane, financial MRR metrics, customer modifiers, audit trails, coupon creator, and plan management.
* **Customer Account (John Doe):**
  * **Email:** `john@example.com`
  * **Password:** `password123`
  * **Access:** Customer portal, active **Professional** monthly subscription, API and storage trackers, download invoices, adjust settings.
* **Customer Account (Alice Smith):**
  * **Email:** `alice@example.com`
  * **Password:** `password123`
  * **Access:** Customer portal, active **Starter** yearly subscription, download invoices, adjust notification alerts.

---

## 📡 REST API Documentation

All request headers targeting protected endpoints must include:
`Authorization: Bearer <JWT_TOKEN>`

### 🔓 1. Session Authentication & Preferences
* `POST /api/auth/register` - Registers standard customer account.
  * **Request Body:** `{ "email": "john@example.com", "password": "password123", "name": "John Doe" }`
* `POST /api/auth/login` - Authenticates user & issues Bearer JWT.
  * **Request Body:** `{ "email": "admin@billing.com", "password": "password123" }`
* `GET /api/auth/me` - Resolves active session profile payload.
* `POST /api/auth/preferences` - Updates account name and alert preferences.

### 💳 2. Customer Subscriptions & Proration
* `GET /api/subscriptions/current` - Resolves active subscription and pricing plan details.
* `GET /api/subscriptions/stats` - Resolves API request limits and storage quotas.
* `POST /api/subscriptions` - Creates a new subscription. Handles coupon discounts and sales tax.
  * **Request Body:** `{ "planId": "plan_starter", "billingCycle": "monthly", "couponCode": "SAVE20" }`
* `POST /api/subscriptions/upgrade` - **Prorated Billing Engine.** Evaluates remaining credit of the active plan and outputs the difference for the remaining days of the target plan.
  * **Request Body:** `{ "targetPlanId": "plan_professional", "billingCycle": "monthly" }`
* `POST /api/subscriptions/cancel` - Turns off recurring renewal. Access remains active until period end.

### 🎫 3. Coupon Codes
* `GET /api/coupons` - Lists active coupons.
* `POST /api/coupons` - (Admin) Creates a flat or percentage discount coupon.
* `POST /api/coupons/validate` - Checks code validity, usage limit, and calculates discount.

### 📊 4. Administration Metrics
* `GET /api/admin/stats` - Pulls overall SaaS indicators: MRR, ARR, plan popularity, monthly revenue charts, recent transactions, and system health cards.
* `GET /api/admin/users` - Lists customer accounts and active subscription links.
* `POST /api/admin/users/:id/status` - (Admin) Suspends or activates a customer account.
* `GET /api/admin/audit-logs` - Resolves detailed security audit logs.

---

## 🚀 Installation & Local Execution

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Docker](https://www.docker.com/) (Optional, for containerized execution)

### 1. Repository Setup & Install
```bash
git clone https://github.com/your-username/saas-billing-platform.git
cd saas-billing-platform
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file in the root folder using `.env.example` as a baseline:
```env
JWT_SECRET=your_secret_jwt_key_here
NODE_ENV=development
```

### 3. Start Development Server
This boots up the full Express API backend on port `3000` while utilizing Vite to serve the React HMR frontend:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Production Compilation & Packaging
Bundles the React client into `/dist` static assets and compiles `/server.ts` into a fast, CommonJS self-contained production server file `/dist/server.cjs` using `esbuild`:
```bash
npm run build
npm run start
```

---

## 🐳 Containerized Execution (Docker)

To build and run the entire application using Docker Compose:

```bash
# Compile and start service in background
docker-compose up -d --build

# View runtime server logs
docker compose logs -f
```

The server will be reachable at [http://localhost:3000](http://localhost:3000).

---

## 🔒 Verification & Compliance
* **Linter Code Compliance:** Run `npm run lint` to execute type checks.
* **Production Build Integrity:** Tested for pristine layouts, high color contrasts, fully responsive widgets, and zero broken visual pages.
