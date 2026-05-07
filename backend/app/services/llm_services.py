import os
import requests
from typing import Any, Optional
from pydantic import BaseModel

class LLMResponse(BaseModel):
    content: Optional[str] = None
    tool_calls: list[dict] = []
    usage: dict[str, int] = {}
    raw_response: Any = None

def call_llm_provider(
    provider: str,
    model: str,
    messages: list[dict],
    tools: Optional[list[dict]] = None,
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> LLMResponse:
    """
    Standard interface to talk to any AI provider.
    Currently supports OpenAI.
    """
    provider_name = provider.lower()

    if provider_name == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload: dict[str, Any] = {
            "model": model or "gpt-4o-mini",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if tools:
            payload["tools"] = tools

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        choice_message = data["choices"][0]["message"]
        
        return LLMResponse(
            content=choice_message.get("content"),
            tool_calls=choice_message.get("tool_calls") or [],
            usage=data.get("usage", {}),
            raw_response=data
        )

    raise ValueError(f"Unsupported provider: {provider_name}")
