# ScamShield AI deployment checklist

## Before GitHub

Search the repository for suspicious credential markers such as `AIza`, `GEMINI_API_KEY=`, `Bearer `, `private_key`, `client_secret`, and other secret-like values.

Confirm:
- `.env` is not committed
- `.env.example` contains placeholders only
- no Google service-account JSON is present
- no real credential appears in README/screenshots

## Vercel

1. Import the repository.
2. Add `GEMINI_API_KEY` to the production environment only.
3. Do not expose it as a browser/public environment variable.
4. Deploy.
5. Open the live URL.
6. Run the safe demo.
7. Inspect browser DevTools Network/Sources to ensure the Gemini credential is not exposed.

## Cost guardrail

Keep the hackathon MVP on free tiers. Do not enable paid billing solely to operate this project. If the selected Google AI configuration is not available on the free tier for the account, stop and choose another free-compatible Google model/configuration.
