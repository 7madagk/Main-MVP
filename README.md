# Math2 AI — Secure Backend

## ليه البيكاند ده؟

الـ HTML كان بيبعت calls مباشرة لـ Anthropic API، يعني الـ API key كانت **مكشوفة** لأي حد يفتح الـ source code. 

الـ backend ده بيحل المشكلة:
- الـ API key والـ prompt IDs موجودين **بس على السيرفر**
- الـ frontend بيبعت للـ `/api/chat-a` أو `/api/chat-b` بس
- السيرفر هو اللي بيبعت لـ Anthropic بالـ credentials الحقيقية

---

## Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. إعداد الـ environment variables
```bash
cp .env.example .env
# افتح .env وحط الـ API key الحقيقي بتاعك
```

محتوى الـ `.env`:
```
ANTHROPIC_API_KEY=sk-proj-xxxxxxxx...
PROMPT_ID_A=pmpt_69ba413f411c8197b88a2a029d9d98440b1d2d9a7703c078
PROMPT_ID_B=pmpt_69ba4169c3248193bc74b1eb5686516f05d9e888263498a6
PORT=3000
```

### 3. تشغيل السيرفر
```bash
npm start
```

افتح `http://localhost:3000` في المتصفح.

---

## Structure

```
backend/
├── server.js          ← الـ backend (Express)
├── package.json
├── .env               ← بيانات سرية (لا ترفعه على GitHub!)
├── .env.example       ← template للـ .env
├── .gitignore
└── public/
    └── index.html     ← الـ frontend (نفس HTML بتاعك بعد التعديل)
```

---

## API Endpoints

| Endpoint | Chat | Prompt ID |
|----------|------|-----------|
| `POST /api/chat-a` | Sidebar AI | A |
| `POST /api/chat-b` | Question chats | B |

### Request body
```json
{
  "messages": [
    { "role": "user", "content": "اشرح لي المشتقات الجزئية" }
  ],
  "max_tokens": 600
}
```

---

## Deploy على Render / Railway / Fly.io

1. ارفع الفولدر على GitHub (بدون الـ `.env`)
2. في الـ hosting platform، حط الـ environment variables يدوياً
3. Set start command: `npm start`

---

## ⚠️ أمان

- **لا ترفع الـ `.env` على GitHub أبداً** — موجود في `.gitignore`
- في production، بدّل `origin: '*'` في الـ CORS بـ domain بتاعك
- الـ API key في الكود داخل `server.js` هي fallback للتطوير فقط — في production استخدم environment variables دايماً
