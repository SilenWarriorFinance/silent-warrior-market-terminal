# Silent Warrior Market Terminal — Next.js SaaS Backbone

This version adds:
- Next.js app
- Supabase login
- Supabase watchlist saving
- Backend API routes for Finnhub and CoinGecko
- Buy/sell scoring engine
- Clickable asset details

## Required Vercel Environment Variables

Browser-safe:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

Server-side only:
FINNHUB_API_KEY
COINGECKO_API_KEY

## Supabase Table Upgrade

Run this in Supabase SQL Editor:

alter table watchlists add column if not exists name text;
alter table watchlists add column if not exists category text;
alter table watchlists add column if not exists coin_id text;

## Deploy

Upload this full project to GitHub, replacing the old static files. Vercel should detect Next.js automatically.
