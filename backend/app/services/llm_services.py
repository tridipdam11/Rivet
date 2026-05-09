import os
import time
import json
import logging
from typing import Any, Optional
import requests

from google import genai
from google.genai import types

from pydantic import BaseModel

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception,
    before_sleep_log,
)

# =========================
# Logging
# =========================

logger = logging.getLogger(__name__)

# =========================
# Response Model
# =========================

class LLMResponse(BaseModel):
    content: Optional[str] = None
    tool_calls: list[dict] = []
    usage: dict[str, int] = {}
    raw_response: Any = None


# =========================
# Retry Logic
# =========================

def is_retryable_exception(exception: BaseException) -> bool:
    """
    Retry on:
    - 429 rate limit
    - 5xx provider errors
    """

    # Check for requests-based HTTP errors (OpenAI)
    if isinstance(exception, requests.exceptions.HTTPError):
        status_code = exception.response.status_code
        return status_code == 429 or 500 <= status_code < 600

    # Generic string-based check for status codes and common error messages
    msg = str(exception).lower()
    
    retryable_keywords = [
        "429", 
        "rate limit", 
        "quota", 
        "too many requests", 
        "exhausted", 
        "resource_exhausted",
        "toomanyrequests"
    ]
    
    if any(keyword in msg for keyword in retryable_keywords):
        return True

    # Check for status code attribute (common in many SDKs)
    status_code = getattr(exception, "status_code", None) or getattr(exception, "code", None)
    if status_code in (429, 500, 502, 503, 504):
        return True

    return False


# =========================
# Unified LLM Provider
# =========================

@retry(
    retry=retry_if_exception(is_retryable_exception),
    wait=wait_exponential_jitter(initial=2, max=120),
    stop=stop_after_attempt(8),
    reraise=True,
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def call_llm_provider(
    provider: str,
    model: str,
    messages: list[dict],
    tools: Optional[list[dict]] = None,
    temperature: float = 0.7,
    max_tokens: int = 1000,
) -> LLMResponse:

    provider_name = provider.lower()

    # =========================================================
    # Gemini
    # =========================================================

    if provider_name == "gemini":

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not found in environment variables"
            )

        client = genai.Client(api_key=api_key)

        gemini_model_name = model or "gemini-2.5-flash"

        system_instruction: Optional[str] = None
        contents: list[types.Content] = []

        for msg in messages:

            role = msg["role"]
            content = msg["content"]

            if role == "system":
                system_instruction = content
                continue

            gemini_role = "user" if role == "user" else "model"

            # Merge consecutive messages with the same role for Gemini compliance
            if contents and contents[-1].role == gemini_role:
                if contents[-1].parts and contents[-1].parts[0].text:
                    contents[-1].parts[0].text += f"\n\n{content}"
                else:
                    contents[-1].parts = [types.Part.from_text(text=content)]
            else:
                contents.append(
                    types.Content(
                        role=gemini_role,
                        parts=[
                            types.Part.from_text(text=content)
                        ],
                    )
                )

        # -------------------------
        # Tools
        # -------------------------

        gemini_tools: Optional[list[types.Tool]] = None

        if tools:

            function_declarations: list[types.FunctionDeclaration] = []

            for tool in tools:

                if tool.get("type") != "function":
                    continue

                f = tool["function"]

                function_declarations.append(
                    types.FunctionDeclaration(
                        name=f["name"],
                        description=f.get("description", ""),
                        parameters=f.get(
                            "parameters",
                            {
                                "type": "OBJECT",
                                "properties": {},
                            },
                        ),
                    )
                )

            if function_declarations:
                gemini_tools = [
                    types.Tool(
                        function_declarations=function_declarations
                    )
                ]

        response = client.models.generate_content(
            model=gemini_model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_tokens,
                tools=gemini_tools,
            ),
        )

        # -------------------------
        # Tool Calls
        # -------------------------

        tool_calls: list[dict] = []

        candidate = (
            response.candidates[0]
            if response.candidates
            else None
        )

        content_obj = (
            candidate.content
            if candidate and candidate.content
            else None
        )

        parts = content_obj.parts if content_obj and content_obj.parts else []

        for part in parts:

            function_call = getattr(part, "function_call", None)
            if not function_call:
                continue

            args_dict = getattr(function_call, "args", None) or {}
            function_name = getattr(function_call, "name", None)
            if not function_name:
                continue

            tool_calls.append(
                {
                    "id": None,
                    "type": "function",
                    "function": {
                        "name": function_name,
                        "arguments": json.dumps(args_dict),
                    },
                }
            )

        # -------------------------
        # Usage (None-safe)
        # -------------------------

        usage_metadata = response.usage_metadata

        usage = {
            "prompt_tokens": int(
                usage_metadata.prompt_token_count or 0
            )
            if usage_metadata
            else 0,

            "completion_tokens": int(
                usage_metadata.candidates_token_count or 0
            )
            if usage_metadata
            else 0,

            "total_tokens": int(
                usage_metadata.total_token_count or 0
            )
            if usage_metadata
            else 0,
        }

        # Safely extract text (may be empty on blocked or tool-only response)
        content_text = None
        try:
            content_text = response.text
        except Exception:
            pass

        return LLMResponse(
            content=content_text,
            tool_calls=tool_calls,
            usage=usage,
            raw_response={"model": gemini_model_name, "usage": usage},
        )

    # =========================================================
    # OpenAI
    # =========================================================

    elif provider_name == "openai":

        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY not found in environment variables"
            )

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

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=120,
        )

        # Respect Retry-After
        if response.status_code == 429:

            retry_after = response.headers.get("Retry-After")

            if retry_after and retry_after.isdigit():
                time.sleep(int(retry_after))

        response.raise_for_status()

        data = response.json()

        choice_message = data["choices"][0]["message"]

        usage_data = data.get("usage", {})

        usage = {
            "prompt_tokens": int(
                usage_data.get("prompt_tokens", 0) or 0
            ),
            "completion_tokens": int(
                usage_data.get("completion_tokens", 0) or 0
            ),
            "total_tokens": int(
                usage_data.get("total_tokens", 0) or 0
            ),
        }

        return LLMResponse(
            content=choice_message.get("content"),
            tool_calls=choice_message.get("tool_calls") or [],
            usage=usage,
            raw_response=data,
        )

    raise ValueError(f"Unsupported provider: {provider_name}")
