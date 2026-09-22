const { GoogleGenAI } = require("@google/genai");

const MODEL = "gemini-3.5-flash-lite";

function sendJson(res, statusCode, data) {
  // Vercel serverless response
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(data)
  }

  // Local Node HTTP response
  if (!res.headersSent) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    })

    res.end(JSON.stringify(data))
  }
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizeResult(result) {
  const threatScore = clamp(result?.threatScore, 0, 100);

  let riskLevel = String(result?.riskLevel || "").toLowerCase();

  if (!["low", "medium", "high", "critical"].includes(riskLevel)) {
    if (threatScore >= 80) riskLevel = "critical";
    else if (threatScore >= 60) riskLevel = "high";
    else if (threatScore >= 30) riskLevel = "medium";
    else riskLevel = "low";
  }

  return {
    threatScore,

    riskLevel,

    verdict:
      threatScore >= 80
        ? "Highly suspicious"
        : threatScore >= 60
        ? "Suspicious"
        : threatScore >= 30
        ? "Needs verification"
        : "Lower risk",

    confidence: clamp(result?.confidence ?? 75, 0, 100),

    summary:
      typeof result?.summary === "string"
        ? result.summary
        : "The submitted content was analyzed for common job-scam indicators.",

    redFlags: Array.isArray(result?.redFlags)
      ? result.redFlags.slice(0, 8)
      : [],

    breakdown: Array.isArray(result?.breakdown)
      ? result.breakdown.slice(0, 8)
      : [],

    verificationSteps: Array.isArray(result?.verificationSteps)
      ? result.verificationSteps.slice(0, 8)
      : [],

    doNotShare: Array.isArray(result?.doNotShare)
      ? result.doNotShare.slice(0, 8)
      : [],

    positiveSignals: Array.isArray(result?.positiveSignals)
      ? result.positiveSignals.slice(0, 8)
      : [],

    limitations: Array.isArray(result?.limitations)
      ? result.limitations.slice(0, 8)
      : [],
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
  if (typeof res.setHeader === "function") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  }

  if (typeof res.status === "function") {
    return res.status(204).end()
  }

  res.writeHead(204)
  return res.end()
}

  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "Method not allowed.",
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return sendJson(res, 500, {
      error: "GEMINI_API_KEY is not configured on the server.",
    });
  }

  try {
    const body = req.body || {};

    const offerText =
      typeof body.offerText === "string"
        ? body.offerText.trim().slice(0, 15000)
        : "";

    const submittedUrl =
      typeof body.url === "string"
        ? body.url.trim().slice(0, 2000)
        : "";

    if (!offerText && !submittedUrl) {
      return sendJson(res, 400, {
        error: "Please provide an offer letter or a URL.",
      });
    }

    let urlSignals = {
      provided: false,
      hostname: null,
      protocol: null,
    };

    if (submittedUrl) {
      try {
        const parsedUrl = new URL(submittedUrl);

        urlSignals = {
          provided: true,
          hostname: parsedUrl.hostname,
          protocol: parsedUrl.protocol,
        };
      } catch {
        urlSignals = {
          provided: true,
          hostname: null,
          protocol: null,
        };
      }
    }

    const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 60000,
    headers: {},
  },
});

    const prompt = `
You are ScamShield AI, a consumer cybersecurity assistant.

Analyze the supplied job offer text and/or URL for signs of employment scams,
phishing, advance-fee fraud, identity theft, impersonation, or deceptive
recruitment practices.

IMPORTANT:
- Do not invent facts.
- Do not claim that a domain is old/new unless actual domain-age evidence is supplied.
- Treat missing domain-age information as "not verified".
- Payment demands, urgency, guaranteed employment, requests for sensitive
  documents, unusual contact domains, and lack of an interview can be red flags.
- A suspicious signal does not automatically prove that an offer is fraudulent.
- Give practical verification steps.
- Never ask the user to send passwords, OTPs, banking PINs, or other secrets.

Return ONLY valid JSON.

Required structure:

{
  "threatScore": number,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "confidence": number,
  "summary": "string",
  "redFlags": ["string"],
  "breakdown": [
    {
      "factor": "string",
      "impact": number,
      "reason": "string"
    }
  ],
  "verificationSteps": ["string"],
  "doNotShare": ["string"],
  "positiveSignals": ["string"],
  "limitations": ["string"]
}

Threat score:
0-29 = low
30-59 = medium
60-79 = high
80-100 = critical

Keep the analysis concise and evidence-based.

OFFER TEXT:
${offerText || "(none supplied)"}

SUBMITTED URL:
${submittedUrl || "(none supplied)"}

URL SIGNALS:
${JSON.stringify(urlSignals)}
`;

console.log("Sending request to Gemini...");

    let response;
let lastError;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    console.log(`Gemini attempt ${attempt}/3...`);

    response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 1200,
      },
    });

    console.log(`Gemini response received on attempt ${attempt}.`);
    break;

  } catch (error) {
    lastError = error;

    console.error(
      `Gemini attempt ${attempt} failed:`,
      error?.message || error
    );

    if (attempt < 3) {
      const waitTime = attempt * 1500;

      console.log(
        `Retrying Gemini in ${waitTime}ms...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, waitTime)
      );
    }
  }
}

if (!response) {
  throw lastError || new Error(
    "Gemini could not be reached after 3 attempts."
  );
}

console.log("Gemini response received.");

    let parsed;

    try {
      parsed = JSON.parse(response.text);
    } catch {
      return sendJson(res, 502, {
        error: "Gemini returned an invalid analysis format.",
      });
    }

    const result = normalizeResult(parsed);

    return sendJson(res, 200, {
      success: true,
      model: MODEL,
      result,
      analyzedAt: new Date().toISOString(),
      meta: {
        domain: urlSignals.hostname,
        protocol: urlSignals.protocol,
        domainAgeVerified: false,
      },
    });
  } catch (error) {
    console.error("ScamShield analysis error:", error);

    return sendJson(res, 500, {
      error:
        error?.message ||
        "The AI analysis failed. Please try again.",
    });
  }
};