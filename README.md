# Weladapola Marketplace — Fresh standalone project

This is a **separate new website project**. It does not modify the old site.

## Included
- Modern animated marketplace homepage and mobile layout
- Product search and category filters
- Cart with customer order form (name, phone, address, village, town, province)
- Cash on Delivery order insertion to Supabase
- Seller signup/login via Supabase Auth
- Seller dashboard and product image upload to Storage
- Full-screen modal Admin console: overview metrics, orders/status, sellers with name/phone/email, product management and delete
- Supabase schema starter

## Setup
1. Extract the ZIP into a new folder.
2. Create a **new Supabase project** (recommended) or use a project you explicitly intend for this new site.
3. In Supabase SQL Editor, run `supabase_setup.sql`.
4. In Authentication settings, enable Email/password. Configure email confirmation as desired.
5. Create Storage bucket `product-photos` (SQL file attempts this automatically) and confirm policies.
6. Edit `config.js`: add the Supabase URL and **publishable/anon key only**. Never use the service_role key in browser code.
7. Upload the files to a new GitHub repository (files at repo root).
8. Settings → Pages → deploy from branch `main`, folder `/root`.
9. Admin: sign up with the intended admin email using Seller Register first. Then assign admin role securely using Supabase Auth admin tools (server-side only) to `app_metadata.role = "admin"`; update profile role to admin too. Client-side role cannot grant admin access.
10. After deploy, test signup/login, image upload, public listing, checkout, and admin pages.

## Security note
This is a starter. Orders are private to admins via the SQL policies, but public order INSERT is enabled for guest checkout. Before commercial launch, review RLS, rate limiting, privacy, storage file limits, and payment/delivery workflows. Public seller read policy exposes seller rows; keep only the fields you are comfortable exposing. Seller dashboard currently allows viewing own products and uploading products; delete is admin-only.
