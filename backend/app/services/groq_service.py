from groq import AsyncGroq, PermissionDeniedError, AuthenticationError, RateLimitError, APIConnectionError, APIStatusError
from app.core.config import settings

_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


def reset_groq_client() -> None:
    global _client
    _client = None


async def draft_verification_email(
    applicant_name: str,
    step_name: str,
    step_config: dict | None = None,
) -> str:
    recipient = (step_config or {}).get("recipient_role", "the relevant party")
    subject_hint = (step_config or {}).get("subject", "")

    prompt = f"""You are an HR compliance specialist. Draft a professional background check verification email.

Applicant Name: {applicant_name}
Verification Step: {step_name}
Recipient: {recipient}
{f"Subject hint: {subject_hint}" if subject_hint else ""}

Requirements:
- First line must be: Subject: <your subject line>
- Keep it concise (under 200 words)
- Professional and neutral tone
- Request the specific verification information needed for this step
- Include a polite deadline request
- Sign off as "CheckFlow Verification Team"

Write only the email, nothing else."""

    client = get_groq_client()
    try:
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=600,
        )
        return response.choices[0].message.content or ""
    except (PermissionDeniedError, AuthenticationError) as e:
        reset_groq_client()
        raise RuntimeError(f"Groq access denied — check your API key or network: {e}") from e
    except RateLimitError as e:
        raise RuntimeError("Groq rate limit hit — wait a moment and try again") from e
    except APIConnectionError as e:
        reset_groq_client()
        raise RuntimeError("Could not reach Groq API — check network connectivity") from e
    except APIStatusError as e:
        raise RuntimeError(f"Groq API error {e.status_code}: {e.message}") from e
