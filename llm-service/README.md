# Curalink Rule-Based Summarizer

FastAPI service that creates concise structured medical research summaries
without an LLM. It extracts key points from the top ranked research context and
formats matching clinical trials and sources.

## Setup

Install Python dependencies:

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn app:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Summarizer endpoint:

```bash
curl -X POST http://localhost:8000/llm \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"diabetes\",\"context\":[]}"
```

Response shape:

```json
{
  "overview": "...",
  "key_findings": ["..."],
  "trials": ["..."],
  "sources": ["..."]
}
```
