const test = require("node:test");
const assert = require("node:assert/strict");

const {
  clamp,
  normalizeResult
} = require("./api/analyze.js");

test("clamp keeps values inside the allowed range", () => {
  assert.equal(clamp(50, 0, 100), 50);
  assert.equal(clamp(-10, 0, 100), 0);
  assert.equal(clamp(150, 0, 100), 100);
});

test("clamp handles invalid values safely", () => {
  assert.equal(clamp("invalid", 0, 100), 0);
  assert.equal(clamp(undefined, 0, 100), 0);
});

test("normalizeResult correctly handles a critical result", () => {
  const result = normalizeResult({
    threatScore: 95,
    riskLevel: "critical",
    confidence: 97,
    summary: "Multiple scam indicators detected.",
    redFlags: [
      "Upfront payment demand",
      "Artificial urgency"
    ],
    breakdown: [
      {
        factor: "Payment demand",
        impact: 30,
        reason: "The candidate is asked to pay before joining."
      }
    ],
    verificationSteps: [
      "Verify the employer independently."
    ],
    doNotShare: [
      "Do not share OTPs."
    ],
    positiveSignals: [],
    limitations: [
      "Automated analysis cannot prove fraud."
    ]
  });

  assert.equal(result.threatScore, 95);
  assert.equal(result.riskLevel, "critical");
  assert.equal(result.confidence, 97);
  assert.equal(result.redFlags.length, 2);
});

test("normalizeResult derives risk level from threat score", () => {
  assert.equal(
    normalizeResult({ threatScore: 90 }).riskLevel,
    "critical"
  );

  assert.equal(
    normalizeResult({ threatScore: 70 }).riskLevel,
    "high"
  );

  assert.equal(
    normalizeResult({ threatScore: 40 }).riskLevel,
    "medium"
  );

  assert.equal(
    normalizeResult({ threatScore: 10 }).riskLevel,
    "low"
  );
});

test("normalizeResult limits large arrays", () => {
  const result = normalizeResult({
    threatScore: 50,
    redFlags: Array(20).fill("Example flag"),
    breakdown: Array(20).fill({
      factor: "Test",
      impact: 5,
      reason: "Test"
    }),
    verificationSteps: Array(20).fill("Verify"),
    doNotShare: Array(20).fill("Secret"),
    positiveSignals: Array(20).fill("Positive"),
    limitations: Array(20).fill("Limitation")
  });

  assert.equal(result.redFlags.length, 8);
  assert.equal(result.breakdown.length, 8);
  assert.equal(result.verificationSteps.length, 8);
  assert.equal(result.doNotShare.length, 8);
  assert.equal(result.positiveSignals.length, 8);
  assert.equal(result.limitations.length, 8);
});

test("normalizeResult prevents invalid confidence values", () => {
  assert.equal(
    normalizeResult({ confidence: 150 }).confidence,
    100
  );

  assert.equal(
    normalizeResult({ confidence: -20 }).confidence,
    0
  );
});