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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROMPT_ID_A    = process.env.PROMPT_ID_A;
const PROMPT_ID_B    = process.env.PROMPT_ID_B;

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

// OpenAI Responses API (supports prompt IDs)
async function callOpenAI({ promptId, messages, maxTokens = 1000 }) {
  const input = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  const body = {
    max_output_tokens: maxTokens,
    input
  };

  if (promptId) {
    body.prompt = { id: promptId };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err}`);
  }

  const data = await response.json();

  // Extract text from Responses API format
  const text = data.output
    ?.filter(o => o.type === 'message')
    ?.flatMap(o => o.content)
    ?.filter(c => c.type === 'output_text')
    ?.map(c => c.text)
    ?.join('') || 'حصل خطأ.';

  // Return in format frontend expects
  return { content: [{ text }] };
}

// Chat A — Sidebar AI
app.post('/api/chat-a', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: 'messages array required' });
    const data = await callOpenAI({ promptId: PROMPT_ID_A, messages, maxTokens: max_tokens || 600 });
    res.json(data);
  } catch (err) {
    console.error('[chat-a]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Chat B — Question chats
app.post('/api/chat-b', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: 'messages array required' });
    const data = await callOpenAI({ promptId: PROMPT_ID_B, messages, maxTokens: max_tokens || 1000 });
    res.json(data);
  } catch (err) {
    console.error('[chat-b]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
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
