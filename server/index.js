import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { executePumpFunBuy, initializeSolana } from './pumpfun.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ── Initialize Solana on startup ───────────────────────────────
try {
  initializeSolana();
} catch (err) {
  console.warn('[Server] Solana init skipped — configure .env first:', err.message);
}

// ── Global state ──────────────────────────────────────────────
let eagleTriggered = false;

// ── REST health-check ──────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── WebSocket handling ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Dev-buy request from the slot machine
  socket.on('dev-buy', async (data) => {
    const isFrenzy = data?.frenzy === true;
    const solAmount = isFrenzy ? 0.2 : 0.1;
    const emojis = data?.emojis || '🎰🎰🎰';
    console.log(`[WS] Dev-buy requested: ${solAmount} SOL (frenzy=${isFrenzy})`);

    // Broadcast the win to ALL clients immediately
    io.emit('live-feed', {
      type: 'dev-buy',
      message: `🎰 WIN! ${emojis} → Dev Buy ${solAmount} SOL${isFrenzy ? ' (FRENZY x2!)' : ''}`,
      timestamp: Date.now(),
    });

    try {
      const result = await executePumpFunBuy(solAmount);

      io.emit('live-feed', {
        type: 'dev-buy',
        message: `✅ TX confirmed: ${result.signature.slice(0, 12)}…`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[WS] Dev-buy failed:', error.message);
      io.emit('live-feed', {
        type: 'dev-buy',
        message: `❌ TX failed: ${error.message}`,
        timestamp: Date.now(),
      });
    }
  });

  // Bonus emoji notification relay
  socket.on('bonus-trigger', (data) => {
    io.emit('live-feed', {
      type: 'bonus',
      message: data.message,
      emoji: data.emoji,
      timestamp: Date.now(),
    });
  });

  // Burn popup broadcast (🔥🔥🔥)
  socket.on('burn-trigger', () => {
    io.emit('bonus-popup', { type: 'burn', timestamp: Date.now() });
    io.emit('live-feed', {
      type: 'bonus',
      emoji: '🔥',
      message: '🔥 BURN TRIGGERED! Burning tokens in 3 minutes!',
      timestamp: Date.now(),
    });
  });

  // Lock popup broadcast (🔒🔒🔒)
  socket.on('lock-trigger', () => {
    io.emit('bonus-popup', { type: 'lock', timestamp: Date.now() });
    io.emit('live-feed', {
      type: 'bonus',
      emoji: '🔒',
      message: '🔒 LOCK TRIGGERED! Locking tokens in 3 minutes!',
      timestamp: Date.now(),
    });
  });

  // Boost popup broadcast (🚀🚀🚀) — rare
  socket.on('boost-trigger', () => {
    io.emit('bonus-popup', { type: 'boost', timestamp: Date.now() });
    io.emit('live-feed', {
      type: 'bonus',
      emoji: '🚀',
      message: '🚀 10x DEX BOOST! Paying 10x DEX Boost in 5 minutes!',
      timestamp: Date.now(),
    });
  });

  // Eagle popup broadcast (🦅🦅🦅) — one-time only
  socket.on('eagle-trigger', () => {
    if (eagleTriggered) {
      socket.emit('eagle-blocked', { message: 'DEX pay has already been triggered.' });
      return;
    }
    eagleTriggered = true;
    io.emit('bonus-popup', { type: 'eagle', timestamp: Date.now() });
    io.emit('live-feed', {
      type: 'bonus',
      emoji: '🦅',
      message: '🦅 DEX PAY TRIGGERED! Paying DEX in 5 minutes!',
      timestamp: Date.now(),
    });
  });

  // Send eagle status to newly connected clients
  socket.emit('eagle-status', { triggered: eagleTriggered });

  // Giveaway popup broadcast
  socket.on('giveaway-trigger', () => {
    io.emit('giveaway-popup', { timestamp: Date.now() });
    io.emit('live-feed', {
      type: 'giveaway',
      emoji: '🤑',
      message: '🤑 GIVEAWAY TRIGGERED! Drop your wallet in chat!',
      timestamp: Date.now(),
    });
  });

  // Frenzy mode broadcast
  socket.on('frenzy-trigger', () => {
    io.emit('live-feed', {
      type: 'frenzy',
      emoji: '😳',
      message: '😳 FRENZY MODE ACTIVATED! x2 rewards for 7 spins!',
      timestamp: Date.now(),
    });
  });

  // Chat relay (supplements Supabase persistence)
  socket.on('chat-message', (data) => {
    io.emit('chat-message', { ...data, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
