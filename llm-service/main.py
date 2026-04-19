import re
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field


MAX_CONTEXT_ITEMS = 10
MAX_FINDINGS = 5
MAX_TRIALS = 4
MAX_SOURCES = 8

app = FastAPI(title="Curalink Rule-Based Summarizer")


class SummarizerRequest(BaseModel):
  query: str = Field(..., min_length=1)
  context: list[dict[str, Any]] = Field(default_factory=list)


class StructuredSummary(BaseModel):
  overview: str
  key_findings: list[str]
  trials: list[str]
  sources: list[str]


def tokenize(text: str) -> set[str]:
  return {
    token
    for token in re.split(r"[^a-z0-9]+", text.lower())
    if len(token) > 2
  }


def split_sentences(text: str) -> list[str]:
  sentences = re.split(r"(?<=[.!?])\s+", text.strip())

  return [sentence.strip() for sentence in sentences if len(sentence.strip()) > 30]


def get_summary(item: dict[str, Any]) -> str:
  return str(item.get("summary") or item.get("abstract") or "").strip()


def get_title(item: dict[str, Any]) -> str:
  return str(item.get("title") or "Untitled source").strip()


def score_sentence(sentence: str, query_tokens: set[str], item_index: int) -> int:
  sentence_tokens = tokenize(sentence)
  query_overlap = len(sentence_tokens & query_tokens)
  evidence_terms = {
    "improved",
    "associated",
    "reduced",
    "increased",
    "effective",
    "significant",
    "risk",
    "trial",
    "patients",
    "treatment",
    "therapy"
  }
  evidence_overlap = len(sentence_tokens & evidence_terms)

  return query_overlap * 8 + evidence_overlap * 3 + max(0, 10 - item_index)


def extract_key_findings(query: str, papers: list[dict[str, Any]]) -> list[str]:
  query_tokens = tokenize(query)
  scored_sentences = []

  for index, item in enumerate(papers):
    for sentence in split_sentences(get_summary(item)):
      scored_sentences.append((
        score_sentence(sentence, query_tokens, index),
        sentence
      ))

  findings = []
  seen = set()

  for _, sentence in sorted(scored_sentences, reverse=True):
    normalized = sentence.lower()

    if normalized in seen:
      continue

    findings.append(sentence[:260])
    seen.add(normalized)

    if len(findings) == MAX_FINDINGS:
      break

  return findings


def format_trial(item: dict[str, Any]) -> str:
  status = item.get("status") or "status unavailable"
  locations = item.get("location") or []
  location = locations[0] if locations else "location unavailable"

  return f"{get_title(item)} - {status}; {location}"


def extract_trials(context: list[dict[str, Any]]) -> list[str]:
  trials = [
    format_trial(item)
    for item in context
    if item.get("type") == "trial" or item.get("source") == "clinical_trials"
  ]

  return trials[:MAX_TRIALS]


def extract_sources(context: list[dict[str, Any]]) -> list[str]:
  sources = []
  seen = set()

  for item in context:
    year = item.get("year")
    label = f"{get_title(item)} ({year})" if year else get_title(item)

    if label.lower() in seen:
      continue

    sources.append(label)
    seen.add(label.lower())

    if len(sources) == MAX_SOURCES:
      break

  return sources


def build_overview(query: str, context: list[dict[str, Any]], findings: list[str]) -> str:
  paper_count = sum(1 for item in context if item.get("type") == "article" or item.get("source") == "pubmed")
  trial_count = sum(1 for item in context if item.get("type") == "trial" or item.get("source") == "clinical_trials")

  if findings:
    return (
      f"Top evidence for {query} includes {paper_count} research papers and "
      f"{trial_count} clinical trials. The strongest available point is: {findings[0]}"
    )

  return (
    f"Top evidence for {query} includes {paper_count} research papers and "
    f"{trial_count} clinical trials, but the supplied context has limited summary text."
  )


def summarize(query: str, context: list[dict[str, Any]]) -> StructuredSummary:
  top_context = context[:MAX_CONTEXT_ITEMS]
  papers = [
    item
    for item in top_context
    if item.get("type") == "article" or item.get("source") == "pubmed"
  ]
  findings = extract_key_findings(query, papers)

  return StructuredSummary(
    overview=build_overview(query, top_context, findings),
    key_findings=findings,
    trials=extract_trials(top_context),
    sources=extract_sources(top_context)
  )


@app.get("/health")
async def health() -> dict[str, str]:
  return {
    "status": "ok",
    "mode": "rule-based"
  }


@app.post("/llm", response_model=StructuredSummary)
async def summarize_research(payload: SummarizerRequest) -> StructuredSummary:
  return summarize(payload.query, payload.context)
