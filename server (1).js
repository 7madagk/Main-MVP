const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// Credentials from environment variables ONLY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PROMPT_ID_A       = process.env.PROMPT_ID_A;
const PROMPT_ID_B       = process.env.PROMPT_ID_B;

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const MODEL          = 'claude-sonnet-4-20250514';

async function callAnthropic({ promptId, messages, maxTokens = 1000 }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages
  };

  if (promptId) {
    body.prompt_id = promptId;
  }

  const response = await fetch(ANTHROPIC_BASE, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  return response.json();
}

// Chat A (Sidebar AI)
app.post('/api/chat-a', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: 'messages array required' });
    const data = await callAnthropic({ promptId: PROMPT_ID_A, messages, maxTokens: max_tokens || 600 });
    res.json(data);
  } catch (err) {
    console.error('[chat-a]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Chat B (Question chats)
app.post('/api/chat-b', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: 'messages array required' });
    const data = await callAnthropic({ promptId: PROMPT_ID_B, messages, maxTokens: max_tokens || 1000 });
    res.json(data);
  } catch (err) {
    console.error('[chat-b]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend HTML - works both locally (public/) and on Vercel (root)
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : __dirname;

app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Math2 backend running on http://localhost:${PORT}`);
});
