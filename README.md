
# 🍦 IceCream Inventory Management System

An advanced inventory management web app for ice cream retailers and wholesalers — built with **Next.js (App Router)**, **TypeScript**, **MongoDB**, **Cloudinary**, and **Tailwind CSS**.  
Includes product, stock, and customer management; billing with PDF invoices; OTP-based user registration; seller and bank detail storage; and more.

---

## 🚀 Features

- 🔐 **User Authentication**
  - OTP-based registration & email verification (via Nodemailer)
  - Login, profile update, and password change
- 🧾 **Billing System**
  - Dynamic bill generation with logo, QR, and signature
  - Export to PDF using `jspdf` + `jspdf-autotable`
- 📦 **Product Management**
  - Add, update, delete, and view products
  - Track quantity, price, and categories
- 👥 **Customer Management**
  - Add / edit / delete customers with contact and address info
- 💰 **Seller & Bank Details**
  - Manage seller information and bank account details
- 🔄 **Stock Management**
  - Restock history tracking for products
- ☁️ **Cloudinary Integration**
  - Upload and manage product, logo, QR, and signature images
- 📧 **Email Notifications**
  - OTP verification via Gmail (Nodemailer)
- 🗃️ **MongoDB Database**
  - Stores all data models (users, products, customers, stock, etc.)
- 🧠 **Responsive UI**
  - Built using Tailwind CSS and React components

---

## 🧱 Tech Stack

| Category | Technology |
|-----------|-------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | MongoDB (Mongoose) |
| File Storage | Cloudinary |
| PDF Generation | jsPDF, jsPDF-Autotable |
| Email Service | Nodemailer (Gmail SMTP) |
| Deployment | Vercel |

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root with:

```env
# MongoDB
MONGODB_URI="your-mongodb-connection-string"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (for OTP)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
````

> ⚠️ Do **not** commit `.env.local` to git.

---

## 💻 Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Nitrajsinh-Solanki/icecream-inventory.git
cd icecream-inventory
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 3. Run the development server

```bash
npm run dev
```

Server runs at: **[http://localhost:3000](http://localhost:3000)**

### 4. Build for production

```bash
npm run build
npm run start
```

### 5. Lint (optional)

```bash
npm run lint
```

---

## 📡 API Routes

| Endpoint              | Method              | Description                |
| --------------------- | ------------------- | -------------------------- |
| `/api/register`       | POST                | Register user + send OTP   |
| `/api/verify`         | POST                | Verify OTP                 |
| `/api/login`          | POST                | Login user                 |
| `/api/products`       | GET/POST/PUT/DELETE | Manage products            |
| `/api/customers`      | GET/POST/PUT/DELETE | Manage customers           |
| `/api/seller-details` | GET/POST            | Manage seller info         |
| `/api/bank-details`   | GET/POST            | Manage bank info           |
| `/api/uploads/image`  | POST                | Upload image to Cloudinary |
| `/api/restockHistory` | GET/POST            | Manage restock data        |

---

## 🌐 Deployment on Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login

```bash
vercel login
```

### 3. Initialize project

```bash
vercel --name icecream-inventory
```

### 4. Add environment variables (Production)

```bash
vercel env add MONGODB_URI production
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
vercel env add EMAIL_USER production
vercel env add EMAIL_PASS production
```

(Optional) repeat for `preview` and `development`:

```bash
vercel env add MONGODB_URI preview
vercel env add MONGODB_URI development
```

### 5. Deploy

```bash
vercel --prod
```

> ✅ After first deployment, Vercel will automatically detect Next.js and run the build.

---

## 📸 Cloudinary Setup

1. Create an account on [Cloudinary](https://cloudinary.com/).
2. Get credentials from the **Dashboard** → **Account Details**:

   * Cloud Name
   * API Key
   * API Secret
3. Add them to `.env.local`.

Uploads happen via `/api/uploads/image`, using Cloudinary’s Node SDK.

---

## 📧 Email (OTP) Setup

1. Use a Gmail account.
2. Enable **2-Step Verification** and create an **App Password**.
3. Use that App Password for `EMAIL_PASS` in your `.env.local`.

---

## ⚠️ Troubleshooting

| Issue                    | Possible Cause            | Fix                                                    |
| ------------------------ | ------------------------- | ------------------------------------------------------ |
| MongoDB connection fails | Invalid URI or IP blocked | Check `MONGODB_URI` and whitelist your IP              |
| Cloudinary upload fails  | Missing env vars          | Verify Cloudinary credentials                          |
| OTP email not sent       | Gmail security block      | Use App Password or enable SMTP access                 |
| PDF missing images       | Invalid image URLs        | Ensure images are hosted or re-uploaded via Cloudinary |

---

## 🧩 Folder Structure

```
src/
 ├── app/
 │   ├── api/                # API routes
 │   ├── dashboard/          # UI pages
 │   ├── login/ register/    # Auth pages
 │   └── components/         # UI components
 ├── lib/
 │   ├── mongodb.ts          # MongoDB connection
 │   ├── cloudinary.ts       # Cloudinary setup
 │   └── nodemailer.ts       # Email service
 ├── models/                 # Mongoose schemas
 └── utils/                  # Helpers
```

---

## 🛠️ Useful Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm run start

# Lint code
npm run lint
```

---

## 🧭 Future Enhancements

* Add JWT or NextAuth for secure session handling
* Role-based access (admin, staff)
* Analytics dashboard for sales
* Image compression before upload
* Improved PDF styling & multiple invoice templates

---


## 📝 License

This project is licensed under the **MIT License**.
You’re free to use, modify, and distribute with proper attribution.

---
