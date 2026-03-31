Synthesis is failing primarily due to rate limiting (429). Fix the call pattern before changing providers.

Action order:

1. Enforce cluster qualification strictly.
2. Run one synthesis call per qualified cluster only.
3. Cache unchanged cluster outputs.
4. Trim inputs to excerpts only.
5. Temporarily move synthesis interval to 60–90 minutes or make it trigger-based.
6. Add provider abstraction.
7. Add Groq as first fallback provider.
8. Keep OpenRouter as optional future router layer.

Do not replace Gemini blindly until the synthesis workflow is rate-limit safe.
