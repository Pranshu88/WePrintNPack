# We Print N Pack

Phase 1 scaffold for a Vistaprint-style web-to-print storefront focused on:

- homepage and marketing shell
- product catalog and product detail pages
- artwork upload flow
- cart and checkout
- customer order tracking
- admin dashboard

## Stack

- Next.js App Router
- React
- TypeScript

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current routes

- `/`
- `/products`
- `/products/[slug]`
- `/upload-artwork`
- `/cart`
- `/checkout`
- `/account/orders`
- `/admin`
- `/contact`

## Notes

- This is a Phase 1 UI and flow scaffold with static data.
- Node.js is not installed in the current environment, so dependencies were not installed and the app was not executed here.
- Next steps are wiring real product data, authentication, uploads, payment processing, and admin persistence.
