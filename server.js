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

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
const MODEL       = 'gpt-4o-mini';

const SYSTEM_A = process.env.SYSTEM_A ||
  'أنت مساعد تعليمي متخصص في التفاضل الجزئي لطلاب Math 2. أسلوبك مختصر وبالعامية المصرية.';

const SYSTEM_B = process.env.SYSTEM_B ||
  'أنت مساعد تعليمي متخصص في التفاضل الجزئي لطلاب Math 2 في الجامعة. أسلوبك بسيط وودود وبالعامية المصرية مع استخدام LaTeX للمعادلات. اشرح خطوة خطوة، كن موجزاً، شجع الطالب.';

async function callOpenAI({ system, messages, maxTokens = 1000 }) {
  const response = await fetch(OPENAI_BASE, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...messages
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err}`);
  }

  const data = await response.json();

  // Convert OpenAI response format to match what frontend expects
  return {
    content: [{ text: data.choices[0].message.content }]
  };
}

// Chat A — Sidebar AI
app.post('/api/chat-a', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: 'messages array required' });
    const data = await callOpenAI({ system: SYSTEM_A, messages, maxTokens: max_tokens || 600 });
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
    const data = await callOpenAI({ system: SYSTEM_B, messages, maxTokens: max_tokens || 1000 });
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
