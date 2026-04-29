"""
Base scraper class. Each McMaster source extends this.
"""
from __future__ import annotations
import os
import re
import time
import textwrap
from abc import ABC, abstractmethod
from typing import Generator

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client

from pathlib import Path
load_dotenv(Path(__file__).parent.parent / ".env")

# ── Clients ───────────────────────────────────────────────────────────────────
def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)

_embed_model = "models/gemini-embedding-001"

# ── Helpers ───────────────────────────────────────────────────────────────────
CHUNK_SIZE = 500      # tokens ≈ chars / 4, so ~2000 chars
CHUNK_OVERLAP = 50

def clean_html(html: str) -> str:
    """Strip tags and collapse whitespace."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove nav, footer, script, style
    for tag in soup(["nav", "footer", "script", "style", "header"]):
        tag.decompose()
    text = soup.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks (by word count)."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + size])
        if chunk:
            chunks.append(chunk)
        i += size - overlap
    return chunks


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embed via Gemini. Returns list of float vectors."""
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    embeddings = []
    for text in texts:
        result = genai.embed_content(model=_embed_model, content=text)
        embeddings.append(result["embedding"])
        time.sleep(0.05)
    return embeddings


# ── Base Scraper ──────────────────────────────────────────────────────────────
class BaseScraper(ABC):
    source_name: str        # human-readable, e.g. "Tuition Fees 2024"
    source_url: str         # canonical McMaster page URL

    def run(self):
        print(f"[{self.source_name}] Fetching {self.source_url} ...")
        html = self._fetch(self.source_url)
        text = self.parse(html)
        chunks = chunk_text(text)
        print(f"[{self.source_name}] {len(chunks)} chunks — embedding ...")
        embeddings = embed_texts(chunks)

        sb = get_supabase()

        # Delete old entries for this source
        sb.table("knowledge_chunks").delete().eq("source_url", self.source_url).execute()

        # Insert fresh chunks
        rows = [
            {
                "source_url": self.source_url,
                "source_name": self.source_name,
                "content": chunk,
                "embedding": emb,
            }
            for chunk, emb in zip(chunks, embeddings)
        ]
        sb.table("knowledge_chunks").insert(rows).execute()
        print(f"[{self.source_name}] ✓ {len(rows)} chunks saved.")

    @abstractmethod
    def parse(self, html: str) -> str:
        """Return cleaned plain text from the raw HTML."""
        ...

    @staticmethod
    def _fetch(url: str, timeout: int = 15) -> str:
        headers = {"User-Agent": "MacAnswers-Bot/1.0 (+https://macanswers.ca)"}
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        return resp.text
