EcoRescue is a modern, responsive, full-stack Food Waste Management System. It allows Restaurants and Businesses to track inventory levels, log food waste reasons, and schedule surplus food donations. Local NGOs can track available food collections geolocated on interactive maps and claim them for redistribution, while System Administrators supervise the network.

---

- **Frontend**: React.js, Tailwind CSS (v4), Leaflet.js, Recharts, Axios, Lucide Icons, React Router DOM
- **Backend**: Node.js, Express.js (REST APIs)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) and bcrypt password hashing
- **Notifications**: Transactional emails via Nodemailer (with Ethereal SMTP fallback)

---

````
/
---

## Setup & Running Guide

### 1. Prerequisites
- **Node.js**: v18+ recommended (tested on v22.16.0)
- **PostgreSQL**: A running instance (local or hosted, e.g., Supabase / Neon / Docker)

---

### 2. Backend Server Setup

1. Open your terminal and navigate to the server folder:
   ```bash
   cd server
````

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create or check the `.env` file in the `server` directory and replace the database URL and credentials:

   ```env
   PORT=5005
   DATABASE_URL="postgresql://username:password@localhost:5432/foodwaste?schema=public"
   JWT_SECRET="food_waste_secret_token_key_2026"

   # Optional SMTP server configuration (defaults to mock Ethereal SMTP if left empty)
   EMAIL_HOST="smtp.ethereal.email"
   EMAIL_PORT=587
   EMAIL_USER=""
   EMAIL_PASS=""
   ```

4. Run database migrations to provision the schema:

   ```bash
   np
   ```

5. Seed the database with initial users (Admin, Restaurant, NGO) and food item datasets:

   ```bash
   npm run seed
   ```

   _Note: Seeding creates the following test accounts (password for all is `password123`):_
   - **Admin**: `admin@foodrescue.org`npm inst
   - **Restaurant**: `bistro@foodrescue.org`
   - **NGO**: `rescue@foodrescue.org`

6. Start the Express server in development mode:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:5005`.

---

### 3. Frontend Client Setup

1. Navigate to the client folder:

   ```bash
   cd ../client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend app will launch at `http://localhost:5173` (or the next available port).

---

## Verification & Testing

### Backend Unit Tests

We use Jest for unit testing routing middlewares and role restrictions. Run the test suite with:

```bash
cd server
npm test
```

### Manual Walkthrough of System Features

1. **Authentication**: Navigate to `http://localhost:5173/login` and log in with restaurant credentials (`bistro@foodrescue.org` / `password123`).
2. **Inventory**: Select "Inventory" to view current stock items. Edit stock levels inline or add a new food item (e.g. "Sourdough Bread", Bakery, 25 loaves, expiring tomorrow).
3. **Waste Logging**: Select "Waste Log". Add a waste log entry for a portion of the stock (e.g. 5 loaves, reason "Expired"). Verify that the inventory count decreases to 20.
4. **Donation Posting**: Select "Donations" -> "Schedule Donation". Select "Sourdough Bread", quantity 10, select tomorrow's pickup time, enter an address, and set coordinates (e.g., lat: `40.7128`, lng: `-74.0060`).
5. **Collection Claiming**: Log out and log in with the NGO account (`rescue@foodrescue.org` / `password123`). Navigate to the "Map" or "Dashboard" where you will see the active Sourdough Bread donation. Click "Claim / Collect".
6. **milestones Tracking**: Verify that the status shifts to "ACCEPTED" and an email notification print-out appears in the backend server console. Once collected, click "Mark Picked Up" to transition to "COMPLETED".
7. **Admin controls**: Log out and log in with the Admin account (`admin@foodrescue.org` / `password123`). Navigate to `/admin` to modify user roles or purge accounts. Check `/analytics` to review graphical waste and completion charts.
