# Security notes

ScamShield processes untrusted job-offer text and URLs.

## Main risks

- prompt injection inside pasted content
- accidental credential exposure
- sensitive personal information in pasted messages
- malformed AI output
- malicious or malformed URLs
- upstream API failures
- public repository leaks

## Mitigations

- User content is explicitly treated as untrusted data in the Gemini prompt.
- Gemini credentials are server-side only.
- Structured JSON output is requested and parsed.
- Scores are clamped to 0–100.
- URL parsing accepts only HTTP/HTTPS.
- RDAP lookup is best effort; unavailable results are not fabricated.
- No permanent scan history is required.
- `.env` files are ignored by Git.

## Credential incident rule

If a real key is ever committed to Git or shared publicly, revoke/rotate it. Removing the file from the latest commit alone is not sufficient.
