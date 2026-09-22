# ScamShield AI

> Don't lose your dream job to a fake offer.

ScamShield AI is an explainable consumer security scanner for suspicious job offers and recruitment messages. A user can paste an offer/appointment message and optionally provide a URL. The app combines deterministic red-flag signals, optional public RDAP domain context, and Google Gemini analysis to produce a 0–100 Scam Threat Index with evidence, explanations, verification steps, and a list of information the user should not share prematurely.

## PromptWars problem statement

This project implements the **Fake Offer Letter & Phishing Inspector** challenge. The supplied challenge asks for a single-page security scanner that parses job-offer text or URLs, checks domain-age and payment-demand red flags, and calculates a dynamic Scam Threat Index (0–100%).

## What we built

- Job-offer / appointment-letter analysis
- Optional suspicious URL analysis
- Payment-demand detection
- Urgency/manipulation signal detection
- Credential and document-request signal detection
- Unrealistic-offer signal detection
- Public RDAP domain context when available
- Google Gemini structured analysis
- Explainable 0–100 threat score
- Risk breakdown and evidence cards
- Verification checklist
- “Do not share yet” guidance
- Confidence and limitations display
- Responsive desktop/mobile UI
- No account or permanent scan history required

## Architecture

```text
Browser
  |
  | POST /api/analyze
  v
Vercel Serverless Function
  |
  +--> deterministic signals
  +--> public RDAP lookup (best effort)
  +--> Google Gemini API (server-side key)
  |
  v
Structured JSON result
  |
  v
ScamShield UI
```

There is **no frontend framework or build step** in this MVP. The UI is plain HTML/CSS/JavaScript, which keeps the project lightweight and reduces the zero-cost deployment surface.

## Google AI

The server function uses the Google Gemini API with a structured JSON response schema. The default model is `gemini-3.8-flash`, which Google currently documents as a stable Gemini model with structured-output support. Keep the API credential server-side.

## ₹0 target

The project is designed for a ₹0 development budget using free tooling and free tiers. Google currently documents free-tier pricing for Gemini 3.8 Flash; quotas can change. Do not enable paid billing just to run this MVP.

## Run locally

This project has no npm dependency requirement for the frontend. The production API endpoint is a Vercel serverless function, so the simplest way to run the complete project is a free Vercel deployment.

For local development with the serverless function, use a Vercel-compatible local runtime if available. Alternatively, deploy a private test copy first.

## Deployment on Vercel

1. Create a public GitHub repository after the security audit.
2. Push the project files.
3. Import the repository into Vercel.
4. In Vercel project settings, add the server-side environment variable:

```text
GEMINI_API_KEY=<your private Google AI Studio key>
```

5. Do **not** prefix it with `VITE_` or expose it to the browser.
6. Deploy.
7. Open the live URL.
8. Use the built-in safe demo.
9. Inspect browser DevTools to confirm the Gemini key is not present in source or network requests.

## Security checklist

Before making GitHub public:

- [ ] `.env` is ignored
- [ ] `.env.example` has placeholders only
- [ ] no API keys in source
- [ ] no API keys in README
- [ ] no service-account JSON
- [ ] no passwords/tokens/private keys
- [ ] no secrets in screenshots
- [ ] no secret logging
- [ ] Gemini key is server-side only
- [ ] production environment variable is private

If a real key has ever been committed publicly, revoke/rotate it before continuing.

## Limitations

ScamShield is an AI-assisted screening tool, not a definitive fraud detector. A low score does not prove an offer is safe, and a high score does not by itself prove criminal fraud. If RDAP information is unavailable, the UI says so instead of fabricating domain age.

## Demo

The scanner includes a clearly labeled synthetic demo offer containing multiple suspicious signals. It is intended for the live hackathon presentation. Do not use real people's personal information.
