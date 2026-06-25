"""
Unified text-generation provider.

Prefers Google Gemini when GEMINI_API_KEY (or GOOGLE_API_KEY) is set — this is
what powers the autonomous daily planner and AI briefing, and is the headline
Google technology in the project. Falls back to Anthropic Claude when no Gemini
key is present, so the app keeps working with zero extra setup.
"""

import os
from typing import Optional

_GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_gemini_model = None
if _GEMINI_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=_GEMINI_KEY)
        _gemini_model = genai.GenerativeModel(_GEMINI_MODEL)
        print(f"[AI] Using Google Gemini ({_GEMINI_MODEL})")
    except Exception as e:
        print(f"[AI] Gemini init failed, will fall back to Claude: {e}")
        _gemini_model = None

# Claude fallback (already used by the chat agent)
_anthropic_client = None
_CLAUDE_MODEL = "claude-haiku-4-5-20251001"
try:
    import anthropic
    _anthropic_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
except Exception:
    _anthropic_client = None


def active_provider() -> str:
    if _gemini_model is not None:
        return "gemini"
    if _anthropic_client is not None:
        return "claude"
    return "none"


async def generate(prompt: str, system: Optional[str] = None, max_tokens: int = 1024) -> str:
    """Generate a single text completion. Returns '' on total failure."""
    # ── Gemini ──
    if _gemini_model is not None:
        try:
            full = f"{system}\n\n{prompt}" if system else prompt
            resp = await _gemini_model.generate_content_async(full)
            return (resp.text or "").strip()
        except Exception as e:
            print(f"[AI] Gemini generation failed, falling back: {e}")

    # ── Claude fallback (text only) ──
    if _anthropic_client is not None:
        try:
            kwargs = {
                "model": _CLAUDE_MODEL,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system:
                kwargs["system"] = system
            resp = await _anthropic_client.messages.create(**kwargs)
            return "".join(b.text for b in resp.content if b.type == "text").strip()
        except Exception as e:
            print(f"[AI] Claude generation failed: {e}")

    return ""


def vision_available() -> bool:
    return _gemini_model is not None


async def generate_from_image(prompt: str, image_bytes: bytes, mime_type: str = "image/png") -> str:
    """Multimodal extraction with Google Gemini Vision. Returns '' if unavailable."""
    if _gemini_model is None:
        return ""
    try:
        resp = await _gemini_model.generate_content_async(
            [prompt, {"mime_type": mime_type, "data": image_bytes}]
        )
        return (resp.text or "").strip()
    except Exception as e:
        print(f"[AI] Gemini vision failed: {e}")
        return ""
