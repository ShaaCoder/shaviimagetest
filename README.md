# 🛒 BrandAndOffer E-Commerce Platform

This document provides a comprehensive overview of the BrandAndOffer E-Commerce Platform, detailing its features, functionality, architecture, and core components.

---

## ✨ Key Features

### Core E-Commerce & Shopping Experience
- **Dynamic Homepage:** Features a hero banner, category showcase, and dynamically loaded featured products for an engaging user experience.
- **Product Catalog:** Users can browse products by category and brand. The system supports complex category and subcategory structures.
- **Detailed Product Pages:** Each product has a dedicated page with a photo gallery, detailed descriptions, pricing, and stock status. SEO is automatically handled with dynamic metadata and structured data generation.
- **Advanced Search:** The platform includes a search functionality for finding products.
- **Shopping Cart:** A persistent shopping cart that validates its contents (e.g., for stock changes) upon checkout.

### Checkout, Payments & Shipping
- **Multi-Step Secure Checkout:** A user-friendly, multi-step checkout process that guides the user through adding a shipping address and selecting a payment method.
- **Dynamic Shipping Rate Calculation:** Integrates directly with **Shiprocket** to calculate real-time shipping rates based on the customer's PIN code, cart weight, and order value. It supports free shipping thresholds and complex hybrid shipping logic.
- **Multiple Payment Options:**
    - **Stripe Integration:** Secure online payments via Credit/Debit cards and UPI, processed through Stripe.
    - **Cash on Delivery (COD):** Users can opt to pay upon delivery.
- **Coupon & Offer System:** The checkout process supports applying coupon codes for discounts.

### User & Order Management
- **User Authentication:** Secure user registration, login, and profile management handled by **NextAuth.js**.
- **Order History & Tracking:** Registered users can view their order history and track the status of their shipments.

### Comprehensive Admin Dashboard
- **Full CRUD Management:** A powerful, access-controlled admin panel for full Create, Read, Update, and Delete (CRUD) operations on:
    - **Products:** Add, edit, and delete products using either a simple or an enhanced form with a vast number of fields.
    - **Categories:** Manage categories and their subcategories.
    - **Orders:** View and manage all customer orders.
- **Bulk Product Upload:** Admins can efficiently add a large number of products using a **CSV upload** feature.
- **Order Fulfillment:**
    - **Status Management:** Manually update order status (e.g., Confirmed, Shipped, Delivered).
    - **Shipment Creation:** Directly create shipments in **Shiprocket** from the admin panel.
- **Store Insights:** The dashboard provides quick stats on revenue, orders, products, and stock levels.

---

## 🚀 Project Structure

This project is a modern web application built with Next.js, TypeScript, and uses MongoDB as its database.

### 📁 `app/` - Pages & Routing
Contains the application's pages and routing. Key pages include the homepage, product pages, cart, checkout, and the entire admin dashboard.

- `app/page.tsx` - The homepage.
- `app/products/[slug]/page.tsx` - The product detail page.
- `app/cart/page.tsx` - The user's shopping cart.
- `app/checkout/page.tsx` - The checkout page.
- `app/admin/page.tsx` - The main admin dashboard.
- ... and other pages for user profiles, orders, etc.

### ⚙️ `app/api/` - API Endpoints
Contains all backend API routes. This is the heart of the server-side logic.

- `app/api/products/**` - APIs for all product-related operations.
- `app/api/orders/**` - APIs for creating and managing orders.
- `app/api/payments/**` - APIs for handling payment intents and Stripe webhooks.
- `app/api/shipping/**` - API for calculating shipping rates via Shiprocket.
- `app/api/auth/**` - NextAuth.js authentication routes.
- `app/api/delivery/**` - APIs for creating shipments and tracking.

### 🧩 `components/` - Reusable UI Components
Contains all reusable React components. This directory is well-organized into feature-specific and general UI components.

- `components/checkout-page-client.tsx` - The main component handling the entire client-side checkout flow.
- `components/admin/**` - A rich set of components for the admin dashboard, including product forms, CSV upload, and order management tools.
- `components/payment/stripe-checkout.tsx` - Component for handling the Stripe payment process.
- `components/ui/` - A large collection of primitive UI components (Button, Card, Input, etc.) from **ShadCN/UI**.

### 🪝 `hooks/` - Custom React Hooks
Contains custom React hooks for managing stateful logic across the application.

- `hooks/use-products.ts` - Fetches and manages product data.
- `hooks/use-orders.ts` - Fetches and manages order data.
- `hooks/use-auth.ts` - Manages authentication state.
- `hooks/use-shipping-rates.ts` - Manages shipping rate calculations.

### 📚 `lib/` - Core Libraries & Utilities
Contains core application logic, database connection, and third-party service integrations.

- `lib/stripe.ts` - Server-side Stripe integration for creating payment sessions and intents.
- `lib/shiprocket.ts` - Server-side Shiprocket integration for authentication and rate calculation.
- `lib/mongodb.ts` - MongoDB connection and utility functions.
- `lib/nextauth.ts` & `lib/auth.ts` - Configuration and core logic for NextAuth.js.
- `lib/payment.ts` - Core payment processing logic.

### 🗂️ `models/` - Data Models
Contains the Mongoose data models for the MongoDB database, defining the schema for each data entity.

- `models/Product.ts` - The Product model.
- `models/Order.ts` - The Order model.
- `models/User.ts` - The User model.
- `models/Category.ts` - The Category model.
- `models/Brand.ts` - The Brand model.

---
*This README was auto-generated and enhanced by the Gemini CLI.*