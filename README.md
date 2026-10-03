# 🚀 LDXODOO – Modern & Beautiful Inventory Management
Automated Replenishments, Real-Time Warehouse Analytics & Seamless Operations  
**[Features](#-ui-screenshots--features) • [Installation](#%EF%B8%8F-installation--setup) • [Architecture](#-performance--technologies) • [Actions](#-server-actions-snapshot)**

---

## 🖼️ UI Screenshots & Features

### 1. Animated Landing Page & Dashboard
**Homepage:** A uniquely crafted landing experience featuring a clean, airy SaaS aesthetic, dynamic hand-drawn doodle layers, and smooth micro-animations to act as the gateway to your warehouse operations.

### 2. Secure Authentication & Recovery
**Edge-Ready Auth:** Custom authentication system utilizing `jose` for Edge-compatible JWTs, secure HttpOnly cookies, and robust bcrypt password hashing. Includes a complete forgot/reset password flow powered by Nodemailer.

### 3. Warehouse Operations Hub
**User Dashboard:** Consolidated inventory data management. Track real-time stock levels, warehouse receipts, and deliveries simultaneously across your organization with an intuitive, clutter-free interface.

### 4. Optimized Picking & Routing
**Batch Picking:** Leverage smart routing to group multiple small orders into one picking wave, drastically reducing warehouse walking time and increasing operational efficiency.

---

## 🎯 System Overview

This project is an advanced **Inventory and Warehouse Management Platform** designed to drastically streamline stock operations, real-time analytics aggregation, and intelligent warehouse automation. It serves as a beautiful, intuitive alternative to legacy ERP systems like Odoo, bridging the gap between complex backend logic and premium frontend design.

### 🚀 What It Does

- **Modern Odoo Alternative:** Provides essential inventory, receipt, and delivery features without the clunky legacy UI.
- **Flawless Replenishments:** Automate purchase orders and manage backorders seamlessly.
- **Custom Design System:** Built with meticulous attention to detail, utilizing raw CSS variables, curated color palettes (`--plum`, `--mint`, `--coral`), and hand-drawn SVG/image overlays for a highly premium, humanized feel.

---

## 📊 Performance & Technologies

### Component Breakdown

```text
┌─────────────────────────────────────────────────────────────┐
│                 CLIENT UI (React / Next.js)                 │
│         Beautiful, airy components with hand-drawn layers   │
└─────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               NEXT.JS SERVER ACTIONS (Node/Edge)            │
│         - Form Validations (Zod)                            │
│         - Secure Session Management (jose)                  │
│         - Email Delivery (Nodemailer)                       │
└─────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                DATABASE LAYER (Prisma ORM)                  │
│         - PostgreSQL connection pooling                     │
│         - Activity Logging & Audit Trails                   │
│         - Password Reset Token Management                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Technologies

- **Frontend:** Next.js (App Router), React 18+, CSS/Tailwind utilities, Lucide Icons
- **Backend:** Next.js Server Actions, Next/Headers (Cookies)
- **Database:** PostgreSQL, Prisma ORM (v7+)
- **Security & Auth:** `jose` (JWT), `bcryptjs`, `zod`
- **Integrations:** Nodemailer (Gmail SMTP for password resets)

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js 18+**
- **PostgreSQL Database** (Local or Cloud)
- **Gmail Account** (for SMTP App Passwords)

### Backend & Database Setup

```bash
# Clone the repository and install dependencies
npm install

# Configure Environment
# Rename .env.example to .env and input your specific credentials:
# DATABASE_URL="postgresql://user:password@localhost:5432/ldxodoo"
# JWT_SECRET="your-super-secret-jwt-key"
# GMAIL_USER="your-email@gmail.com"
# GMAIL_APP_PASSWORD="your-16-char-app-password"

# Generate Prisma Client and push schema to database
npx prisma generate
npx prisma db push

# (Optional) Seed the database with default admin users
npx prisma db seed
```

### Start Development Server

```bash
# Start Development Server
npm run dev
```
The App runs on [http://localhost:3000](http://localhost:3000)

---

## 🔌 Server Actions (Snapshot)

Because this app utilizes Next.js App Router, traditional API endpoints are replaced by highly secure **Server Actions**.

### Authentication & Sessions
| Action | Description |
| :--- | :--- |
| `loginAction` | Validates credentials, issues JWT, sets HttpOnly cookie |
| `signupAction` | Hashes passwords, creates user, initializes session |
| `logoutAction` | Clears the session cookie and logs the event |

### Account Recovery
| Action | Description |
| :--- | :--- |
| `forgotPasswordAction` | Generates secure token, logs request, sends Nodemailer email |
| `resetPasswordAction` | Validates active token, updates passwordHash securely |
| `validateResetToken` | Server-side validation before rendering the reset form UI |

---

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments
- Inspired by the functional depth of Odoo.
- Designed with modern SaaS aesthetics in mind.
