# Drelle Shops

Next.js 15 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, Storage, RLS). WhatsApp checkout. Deploys on Vercel.

## Supabase (already created)
Project `drelle-shops`, ref `houzqrxtnjzdxbjugfgr`, region eu-west-2. Migrations in `supabase/migrations/` have been applied (schema, RLS, storage buckets + policies, server functions, seed). To rebuild elsewhere, run the four files in order.

## 1. Create the single administrator (required, one time)
1. Supabase Dashboard → Authentication → Users → **Add user** → *Create new user*. Email = the value you will set as `ADMIN_EMAIL` (suggested `admin@drelleshops.com`), choose a strong password, tick **Auto Confirm User**. The password is only ever typed into Supabase.
2. Authentication → Sign In / Providers → turn **off** "Allow new users to sign up" (recommended).
3. SQL Editor, register that user as the administrator:
```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@drelleshops.com';
```
A valid Supabase session alone grants nothing: the app also requires the email to match `ADMIN_EMAIL` and the user to exist in `admin_users`; RLS re-checks it on every query.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)
| Name | Public? | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://houzqrxtnjzdxbjugfgr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase → Settings → API Keys → publishable key |
| `NEXT_PUBLIC_SITE_URL` | yes | your production URL |
| `ADMIN_EMAIL` | **server only** | email of the admin user from step 1 |
| `LOGIN_HMAC_SECRET` | **server only** | `openssl rand -hex 32` (>= 32 chars) |

The Supabase service-role key is deliberately **not used**.

## 3. Deploy
Push this folder to a Git repo and import it in Vercel (framework: Next.js, defaults). Or `npx vercel --prod` from this folder.
Then: Supabase → Authentication → URL Configuration: set Site URL to the production URL.

## 4. Acceptance checks after deploy
Sign in at `/admin/login` (password only); wrong password shows a generic error and locks that IP for 15 minutes after 5 failures; add a product with images and a video; open it on the storefront; add to cart → "Complete purchase on WhatsApp" creates a pending order visible in Admin → Orders; confirm/cancel it and watch Inventory.

## Behaviour notes
- Seeded products have **inventory tracking off** (no stock numbers were supplied). Turn tracking on and set quantities in Admin → Inventory.
- Seed items marked CS are "price on request": not purchasable, inquiry via WhatsApp only.
- "Murci Bikini" was seeded under maison *Munch* (assumed from the brand list); "Milano", "Pig Necklace", "Fish Purse" have no maison. Edit in admin.
- Stock policy: pending order **holds** stock; confirm/complete **deducts**; cancel **releases**. Preorder items never touch stock.
- Product duplication copies details and variants, not media files.
- Uploads: images 8 MB, videos 50 MB (Supabase free-plan cap); file contents are verified server-side by magic bytes.
- Anonymous order creation is validated and idempotent but not IP rate-limited; consider Vercel's firewall rate limiting on the cart route.
