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

// ── REST health-check ──────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── WebSocket handling ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Dev-buy request from the slot machine
  socket.on('dev-buy', async (data) => {
    try {
      const isFrenzy = data?.frenzy === true;
      const solAmount = isFrenzy ? 0.2 : 0.1;
      console.log(`[WS] Dev-buy requested: ${solAmount} SOL (frenzy=${isFrenzy})`);

      const result = await executePumpFunBuy(solAmount);

      socket.emit('dev-buy-result', {
        success: true,
        signature: result.signature,
        amount: solAmount,
      });

      io.emit('live-feed', {
        type: 'dev-buy',
        message: `✅ Dev Buy ${solAmount} SOL — ${result.signature.slice(0, 8)}…`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[WS] Dev-buy failed:', error.message);
      socket.emit('dev-buy-result', {
        success: false,
        error: error.message,
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

  // Giveaway popup broadcast
  socket.on('giveaway-trigger', () => {
    io.emit('giveaway-popup', { timestamp: Date.now() });
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
