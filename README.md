# 🧠 Curalink – AI-Powered Medical Research Assistant

Curalink is a full-stack MERN-based application that provides **real-time, research-backed medical insights** using data from PubMed and ClinicalTrials.gov.

Instead of generic AI answers, Curalink delivers **structured, evidence-based responses** including research papers, clinical trials, and sources.

---

# 🚀 Features

* 🔍 Real-time **PubMed research paper retrieval**
* 🧪 Clinical trials integration (ClinicalTrials.gov)
* 📊 Smart ranking based on **relevance + recency**
* 🧠 Context-aware follow-up queries
* 🎨 Clean ChatGPT-like UI
* ⚡ Fast and lightweight (no heavy LLM required)

---

## Structure

```text
client/   React + Vite frontend
server/   Express + Mongoose backend
```

## Setup

Install dependencies:

```bash
npm run install:all
```

Create a server environment file:

```bash
cp server/.env.example server/.env
```

Update `server/.env` with your MongoDB connection string.

Create a client environment file:

```bash
cp client/.env.example client/.env
```

For local development, the defaults point to the local Express API.

For production, copy the production examples and replace the placeholder domains:

```bash
cp client/.env.production.example client/.env.production
cp server/.env.production.example server/.env.production
```

## Development

Run the frontend and backend together:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend health check: `http://localhost:5000/api/health`

Chat endpoint:

```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"diabetes\"}"
```

The chat endpoint fetches PubMed and ClinicalTrials.gov data, ranks the merged
results, sends the top 10 to the FastAPI summarizer, and returns a structured
summary with the ranked context.

PubMed search endpoint:

```bash
curl "http://localhost:5000/api/pubmed?query=diabetes"
```

The PubMed endpoint returns up to 50 results with `title`, `abstract`, `authors`,
and `year`.

ClinicalTrials.gov search endpoint:

```bash
curl "http://localhost:5000/api/clinical-trials?query=diabetes"
```

The clinical trials endpoint returns up to 20 trials with `title`, `status`,
and `location`.

Merged ranked search endpoint:

```bash
curl "http://localhost:5000/api/search?query=diabetes"
```

The ranked search endpoint merges PubMed and ClinicalTrials.gov results, sorts
by relevance and recency, and returns the top 10.

## Deployment

Set these environment variables on your deployed frontend:

```bash
VITE_API_URL=https://your-backend-domain.com
```

Set these environment variables on your deployed Express backend:

```bash
PORT=5000
CLIENT_ORIGINS=https://your-frontend-domain.com
SUMMARIZER_URL=https://your-summarizer-domain.com/llm
SUMMARIZER_TIMEOUT_MS=15000
MONGODB_URI=your-production-mongodb-uri
```

For local development only, the Vite dev server can proxy requests with:

```bash
VITE_DEV_API_TARGET=http://localhost:5000
```

Set this environment variable for the FastAPI summarizer host if your platform
requires a dynamic port:

```bash
PORT=8000
```

Production request flow:

```text
React frontend -> Express backend /chat -> FastAPI summarizer /llm
```

## Scripts

- `npm run dev` - start client and server in development mode
- `npm run client:dev` - start only the React app
- `npm run server:dev` - start only the API server
- `npm run client:build` - build the React app
- `npm run server:start` - start the API server without nodemon
- `npm run install:all` - install root, client, and server dependencies
