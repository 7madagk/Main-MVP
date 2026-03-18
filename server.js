/**
 * ══════════════════════════════════════════════
 *  Math2 AI Backend  —  Secure API Proxy
 * ══════════════════════════════════════════════
 *  Hides Anthropic API key + prompt IDs from
 *  the frontend. Frontend sends chat messages
 *  to /api/chat-a or /api/chat-b; this server
 *  injects the real credentials and forwards to
 *  api.anthropic.com/v1/messages.
 * ══════════════════════════════════════════════
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(express.json());

// ── CORS: allow your frontend origin ──────────
// In production, replace '*' with your exact domain
app.use(cors({
  origin: '*',          // e.g. 'https://yourdomain.com'
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// ── Credentials (from environment variables ONLY) ─
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PROMPT_ID_A       = process.env.PROMPT_ID_A;
const PROMPT_ID_B       = process.env.PROMPT_ID_B;

if (!ANTHROPIC_API_KEY) {
  console.error('❌  Missing ANTHROPIC_API_KEY — set it in environment variables');
  process.exit(1);
}

const ANTHROPIC_BASE    = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-sonnet-4-20250514';

// ── Helper: call Anthropic ────────────────────
async function callAnthropic({ promptId, messages, maxTokens = 1000 }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: 'You are a helpful assistant.',
        cache_control: { type: 'ephemeral' }  // will be overridden by prompt
      }
    ],
    messages
  };

  // Use Anthropic Prompt Library if a prompt ID is provided
  if (promptId) {
    body.system = undefined;  // remove inline system
    body.prompt_id = promptId;
  }

  // Clean up undefined fields
  if (!body.system) delete body.system;

  const response = await fetch(ANTHROPIC_BASE, {
    method:  'POST',
    headers: {
      'Content-Type':            'application/json',
      'x-api-key':               ANTHROPIC_API_KEY,
      'anthropic-version':       '2023-06-01',
      'anthropic-beta':          'prompt-caching-2024-07-31'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  return response.json();
}

// ── Route: Chat A  (Sidebar AI) ──────────────
// Uses prompt_id A from the Anthropic Prompt Library
app.post('/api/chat-a', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const data = await callAnthropic({
      promptId:  PROMPT_ID_A,
      messages,
      maxTokens: max_tokens || 600
    });

    res.json(data);
  } catch (err) {
    console.error('[chat-a]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Route: Chat B  (Question chats) ──────────
// Uses prompt_id B from the Anthropic Prompt Library
app.post('/api/chat-b', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const data = await callAnthropic({
      promptId:  PROMPT_ID_B,
      messages,
      maxTokens: max_tokens || 1000
    });

    res.json(data);
  } catch (err) {
    console.error('[chat-b]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve the frontend HTML ───────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  Math2 backend running on http://localhost:${PORT}`);
  console.log(`   Chat A → /api/chat-a  (prompt: ${PROMPT_ID_A.slice(0,20)}…)`);
  console.log(`   Chat B → /api/chat-b  (prompt: ${PROMPT_ID_B.slice(0,20)}…)`);
});
