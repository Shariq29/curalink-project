from fastapi import FastAPI
import requests

app = FastAPI()

# 🔥 USE PHI-3 INSTEAD OF LLAMA3
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "phi3"


# ------------------ PROMPT ------------------ #
def build_prompt(query, context):
    return f"""
You are a medical research assistant.

User Query:
{query}

You are given research data below.
Use ONLY this data. Do NOT hallucinate.

Data:
{context}

Answer in this format:

Condition Overview:
(brief explanation)

Key Research Insights:
- point 1
- point 2

Clinical Trials:
- trial info if available

Sources:
- list sources
"""


# ------------------ CALL OLLAMA ------------------ #
def call_model(prompt):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False
        }
    )

    data = response.json()
    return data.get("response", "")


# ------------------ PARSING ------------------ #
def extract_section(text, section):
    try:
        part = text.split(section + ":")[1]
        return part.split("\n\n")[0].strip()
    except:
        return ""


def extract_list(text, section):
    try:
        part = text.split(section + ":")[1]
        lines = part.strip().split("\n")
        return [l.replace("-", "").strip() for l in lines if l.strip()]
    except:
        return []


def format_output(text):
    return {
        "overview": extract_section(text, "Condition Overview"),
        "key_findings": extract_list(text, "Key Research Insights"),
        "sources": extract_list(text, "Sources")
    }


# ------------------ API ------------------ #
@app.post("/llm")
async def generate(data: dict):
    query = data.get("query", "")
    context = data.get("context", [])

    try:
        prompt = build_prompt(query, context)

        raw = call_model(prompt)

        structured = format_output(raw)

        return {
            "summary": structured,
            "raw": raw
        }

    except Exception as e:
        return {
            "summary": {
                "overview": "Error generating response",
                "key_findings": [],
                "sources": []
            },
            "raw": str(e)
        }