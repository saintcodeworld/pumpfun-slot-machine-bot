# Betmoji Slot Machine — Dev Buy Bot

A gamified web-based Slot Machine for Solana token launches on Betmoji.  
Triggers automated **0.1 SOL Dev Buys** when matching emoji combos land on the middle row.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Socket.IO
- **Database/Realtime:** Supabase (chat persistence + real-time)
- **Blockchain:** @solana/web3.js (Betmoji bonding curve buy)

## Setup

### 1. Server

```bash
cd server
npm install
```

Edit `server/.env` with your keys:

```
TOKEN_MINT_ADDRESS=<your_betmoji_token_mint>
DEV_PRIVATE_KEY=<base58_encoded_private_key>
RPC_URL=https://api.mainnet-beta.solana.com
```

Start the server:

```bash
npm run dev
```

### 2. Client

```bash
cd client
npm install
```

Optionally edit `client/.env` for Supabase:

```
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## How It Works

1. Pull the lever to spin the 3×3 slot machine.
2. **Middle row** is the payline (marked by arrows).
3. **3 matching face emojis** → triggers a 0.1 SOL Dev Buy on Betmoji.
4. **Bonus emojis** trigger special effects (see Legend in-app).
5. **😳 Frenzy Mode** doubles rewards for the next 7 spins.
6. **🤑 Giveaway** shows a global popup asking users to drop wallets in chat.

## Supabase (Optional)

Create a `chat_messages` table:

```sql
create table chat_messages (
  id bigint generated always as identity primary key,
  nickname text not null,
  text text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;
create policy "Anyone can read" on chat_messages for select using (true);
create policy "Anyone can insert" on chat_messages for insert with check (true);
```

## Security

- The dev private key **never** leaves the server.
- All buy transactions are signed server-side only.
- The frontend communicates via WebSocket; no private keys are exposed.
