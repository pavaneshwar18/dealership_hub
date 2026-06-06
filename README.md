# Bajaj Dealership Hub

Centralised daily reporting web app for a Bajaj 3-wheeler auto dealership with five branches:

- Miryalaguda
- Nalgonda
- Suryapet
- Bhongir
- Kodad

## Roles

- **Admin (owner):** See all branches, submission status, totals, and review reports
- **Branch managers:** Submit and edit daily reports for their branch

## Daily report fields

Aligned with typical Excel + Tally workflows:

- Sales: vehicles sold, sales value (INR), bookings, pending deliveries, test drives
- Service: jobs completed, service revenue (INR)
- Inventory: stock on hand, new stock received
- Finance: cash collected, pending payments (manual summary from Tally)
- Operations: staff present, customer complaints
- Notes: highlights, issues, additional notes

## Getting started

```bash
cd dealership-hub
npm install
npm run db:setup   # migrate + seed
npm run dev
```

## Tech stack

- Next.js (App Router)
- SQLite + Prisma
- Tailwind CSS
- JWT session cookies

## Next steps (planned)

- Mobile app (React Native / PWA)
- Excel export
- WhatsApp/email reminders for missing reports
- Tally integration for finance sync
- Additional users per branch (sales, service staff)
