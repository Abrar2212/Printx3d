# PrintX3D

Custom 3D-printed name keychains. A customer types a name, picks a font and two colours, sees the keychain in 3D, and orders it with cash on delivery. Staff download a print-ready STL that matches exactly what the customer saw.

**Live:** https://printx3d.onrender.com

## Features

**Customers** (`/`)
- Up to 3 lines of text, 12 characters per line (Enter starts a new line).
- Font, text colour and base colour, with a live 3D preview.
- Order with a phone number and address and pay cash on delivery. The customer gets an order code like `PX-1A2B3C4D`.
- Track the order at `/track` with that code. The tracking page never shows the name, phone or address.

**Staff** (`/login`, one shared password per role)

| Role | Password | Gets |
|---|---|---|
| Reception | `STAFF_PASSWORD` | `/operator`: order queue, status updates, STL downloads |
| Admin | `ADMIN_PASSWORD` | `/admin`: all of the above, plus filament colours, keychain settings and a 3D preview |

A login lasts 12 hours. `proxy.ts` blocks staff pages and APIs for anyone without a valid login.

## Tech

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · PostgreSQL + Prisma 5 · three.js / React Three Fiber · zod

## Run it locally

You need Node.js 20.9+ and a PostgreSQL database.

```bash
git clone https://github.com/Abrar2212/Printx3d.git
cd Printx3d
npm install
cp .env.example .env        # then fill in the values below
npx prisma migrate deploy   # create the tables
npm run db:seed             # starter styles and filament colours
npm run dev                 # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | yes | Signs staff login cookies. Any random string of 32+ characters. Changing it logs everyone out. |
| `STAFF_PASSWORD` | yes | Reception login |
| `ADMIN_PASSWORD` | yes | Admin login |
| `PAYMENT_WEBHOOK_SECRET` | no | Only for `/api/webhooks`, a stub for a future online payment gateway |

> **Keep `DATABASE_URL` in `.env` pointed at your local database.** With the live URL there, `npm run dev` puts test orders in the real shop and `npm run db:reset` deletes every real order.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` then `npm start` | Production build and server |
| `npm run db:migrate` | After editing `prisma/schema.prisma`: create and apply a migration |
| `npm run db:seed` | Add or update the starter styles and colours. Never touches orders. |
| `npm run db:studio` | Browse the database in the browser |
| `npm run db:reset` | **Wipes the database**, then re-runs migrations and the seed |
| `npx tsx --test lib/keychain-geometry.test.ts lib/auth.test.ts` | Run the tests |

## How the keychain is built

- `lib/keychain-geometry.ts` builds the plate outline and the raised letters. The 3D preview (`components/3d/StudioCanvas.tsx`) and the STL download (`lib/stl-generator.ts`, served by `/api/orders/[id]/stl`) both use it, so the print matches the preview.
- The text rules (lines, characters per line) are in `lib/keychain-text.ts`, and the order API checks them again on the server. Admin can lower the line limit to 1 or 2 under **Settings**.
- `lib/keychain-geometry.test.ts` runs every font against a set of names. It checks that the letters stay on the plate, that the keyring hole has a wall around it, and that the outline has no crossings or hair-thin spikes. Run it after changing the geometry or adding a font.

## Adding a font

1. `pip install fonttools`
2. `python scripts/font-to-typeface.py path/to/Font.ttf public/fonts/<id>.typeface.json`
3. Add `<id>` to `FONT_STYLE_OPTIONS` in `types/index.ts`.
4. Add `<id>` to the `fonts` list in `lib/keychain-geometry.test.ts` and run the tests.
5. Record the font's license in `public/fonts/README.md`. The keychains are sold, so the license must allow commercial use.

> **Font licenses:** `american_captain` and `thunder_script` are **personal use only**. Buy commercial licenses (links in `public/fonts/README.md`) or remove them before selling keychains in those fonts. `gravity_bold` is CC BY 4.0, so credit its author.

## Deploying to Render

`render.yaml` describes the web service and a free PostgreSQL database.

- **Build command:** `npm install && npx prisma migrate deploy && npm run build`. Migrations run on every deploy, and only new ones are applied.
- **Start command:** `npm run start`
- **Environment:** set `DATABASE_URL` to the database's **Internal** URL, plus `NEXTAUTH_SECRET`, `STAFF_PASSWORD` and `ADMIN_PASSWORD`. A service created by hand rather than as a Blueprint ignores `render.yaml`, so set these in the dashboard.
- **Seed a new database once** from your PC, using the database's **External** URL:
  ```powershell
  $env:DATABASE_URL="<External Database URL>"; npm run db:seed
  ```
  Don't add the seed to the build command. It would undo price, stock and settings changes made in the admin on every deploy.
- The free plan sleeps after about 15 minutes with no visitors, so the next visit takes 30–60 seconds to load.

## Project layout

```text
app/                 pages and API routes (Next.js App Router)
  page.tsx           customizer (home page)
  track/             order lookup and tracking
  login/             staff login
  operator/, admin/  staff dashboards (reception, admin)
  api/               orders, STL download, login, admin (filaments, styles)
components/          UI; 3d/StudioCanvas.tsx is the 3D preview
lib/                 keychain geometry, STL export, auth, database client
prisma/              schema, migrations, seed
public/fonts/        three.js typeface fonts and their licenses
scripts/             font converter
proxy.ts             staff access control
```
