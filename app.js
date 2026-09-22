"use strict";

/* =========================================================
   ScamShield AI — Frontend Application
   ========================================================= */

const API_ENDPOINT = "/api/analyze";

const MAX_OFFER_LENGTH = 18000;
const MAX_URL_LENGTH = 2000;

/* =========================================================
   Demo Data
   ========================================================= */

const DEMO_OFFER = `
Subject: Congratulations! You Are Selected for Immediate Joining

Dear Candidate,

Congratulations! You have been selected for the position of Junior
Software Developer with a salary of ₹7,80,000 per annum.

No interview is required because your profile has been directly selected.

To complete your joining formalities, you must pay a refundable
registration and equipment processing fee of ₹4,999 within the next
2 hours.

Please send your Aadhaar Card, PAN Card and bank account details.

Failure to complete the payment today will result in cancellation
of your selection.

Regards,
HR Recruitment Team
`;

const DEMO_URL =
  "https://career-fast-jobs.example/apply";


/* =========================================================
   DOM Helpers
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const elements = {
  offer: $("#offer"),
  url: $("#url"),
  demoBtn: $("#demoBtn"),
  charCount: $("#charCount"),
  scanBtn: $("#scanBtn"),

  errorBox: $("#errorBox"),
  errorText: $("#errorText"),
  errorClose: $("#errorClose"),

  result: $("#result"),
  loading: $("#loading"),

  scanner: $("#scanner"),
  how: $("#how"),
  safety: $("#safety"),

  navButtons: document.querySelectorAll("[data-nav]")
};


/* =========================================================
   Application State
   ========================================================= */

const state = {
  isScanning: false,
  currentView: "scanner"
};


/* =========================================================
   Utility Functions
   ========================================================= */

function escapeHtml(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function clamp(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(min, Math.min(max, number));
}


function getRiskLabel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";

  return "LOW";
}


function getRiskClass(score) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";

  return "low";
}


function formatText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return escapeHtml(value);
}


/* =========================================================
   Navigation
   ========================================================= */

function showView(viewName) {
  const validViews = ["scanner", "result", "how", "safety"];

  if (!validViews.includes(viewName)) {
    viewName = "scanner";
  }

  state.currentView = viewName;

  document.querySelectorAll(".view").forEach((view) => {
    const isActive = view.id === viewName;

    view.classList.toggle("active", isActive);
    view.hidden = !isActive;
  });

  elements.navButtons.forEach((button) => {
    const target = button.dataset.nav;

    if (target === viewName) {
      button.classList.add("nav-active");

      if (target !== "scanner") {
        button.setAttribute("aria-current", "page");
      } else {
        button.setAttribute("aria-current", "page");
      }
    } else {
      button.classList.remove("nav-active");
      button.removeAttribute("aria-current");
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function initializeNavigation() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.nav);
    });
  });
}


/* =========================================================
   Error Handling
   ========================================================= */

function showError(message) {
  if (!elements.errorBox || !elements.errorText) {
    return;
  }

  elements.errorText.textContent =
    message || "Something went wrong. Please try again.";

  elements.errorBox.classList.remove("hidden");

  elements.errorBox.setAttribute("aria-hidden", "false");
}


function hideError() {
  if (!elements.errorBox) {
    return;
  }

  elements.errorBox.classList.add("hidden");
  elements.errorBox.setAttribute("aria-hidden", "true");
}


function initializeErrorHandling() {
  elements.errorClose?.addEventListener("click", hideError);
}


/* =========================================================
   Loading State
   ========================================================= */

function setLoading(isLoading) {
  if (!elements.loading) {
    return;
  }

  elements.loading.classList.toggle("hidden", !isLoading);

  elements.loading.setAttribute(
    "aria-hidden",
    String(!isLoading)
  );

  if (elements.scanBtn) {
    elements.scanBtn.disabled = isLoading;

    elements.scanBtn.setAttribute(
      "aria-busy",
      String(isLoading)
    );

    elements.scanBtn.innerHTML = isLoading
      ? `
        <span class="loading-spinner" aria-hidden="true"></span>
        Analyzing...
      `
      : `
        <span aria-hidden="true">⌕</span>
        Analyze with ScamShield AI
        <span aria-hidden="true">→</span>
      `;
  }
}


/* =========================================================
   Character Counter
   ========================================================= */

function updateCharacterCount() {
  if (!elements.offer || !elements.charCount) {
    return;
  }

  const length = elements.offer.value.length;

  elements.charCount.textContent =
    `${length.toLocaleString()} / ${MAX_OFFER_LENGTH.toLocaleString()} characters`;

  elements.charCount.setAttribute(
    "aria-label",
    `${length} of ${MAX_OFFER_LENGTH} characters used`
  );
}


/* =========================================================
   Demo Loader
   ========================================================= */

function loadDemo() {
  if (state.isScanning) {
    return;
  }

  if (elements.offer) {
    elements.offer.value = DEMO_OFFER.trim();
  }

  if (elements.url) {
    elements.url.value = DEMO_URL;
  }

  updateCharacterCount();
  hideError();

  elements.offer?.focus();
}


function initializeDemo() {
  elements.demoBtn?.addEventListener("click", loadDemo);
}


/* =========================================================
   Input Validation
   ========================================================= */

function getInput() {
  const offerText = elements.offer?.value
    ?.trim()
    .slice(0, MAX_OFFER_LENGTH) || "";

  const submittedUrl = elements.url?.value
    ?.trim()
    .slice(0, MAX_URL_LENGTH) || "";

  return {
    offerText,
    submittedUrl
  };
}


function validateUrl(url) {
  if (!url) {
    return true;
  }

  try {
    const parsed = new URL(url);

    return ["http:", "https:"].includes(
      parsed.protocol
    );
  } catch {
    return false;
  }
}


function validateInput(input) {
  if (!input.offerText && !input.submittedUrl) {
    return "Please paste an offer letter or provide a URL.";
  }

  if (
    input.submittedUrl &&
    !validateUrl(input.submittedUrl)
  ) {
    return "Please enter a valid HTTP or HTTPS URL.";
  }

  return null;
}


/* =========================================================
   API Request
   ========================================================= */

async function analyzeOffer(input) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      offerText: input.offerText,
      url: input.submittedUrl
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error ||
      "The AI analysis failed. Please try again."
    );
  }

  return data;
}


/* =========================================================
   Result Normalization
   ========================================================= */

function normalizeResult(result = {}) {
  const threatScore = clamp(
    result.threatScore,
    0,
    100
  );

  const confidence = clamp(
    result.confidence ?? 75,
    0,
    100
  );

  const riskLevel =
    ["low", "medium", "high", "critical"].includes(
      String(result.riskLevel).toLowerCase()
    )
      ? String(result.riskLevel).toLowerCase()
      : getRiskClass(threatScore);

  return {
    threatScore,
    confidence,
    riskLevel,

    verdict:
      result.verdict ||
      (
        threatScore >= 80
          ? "Highly suspicious"
          : threatScore >= 60
            ? "Suspicious"
            : threatScore >= 30
              ? "Needs verification"
              : "Lower risk"
      ),

    summary:
      typeof result.summary === "string"
        ? result.summary
        : "The submitted content was analyzed for common job-scam indicators.",

    redFlags: Array.isArray(result.redFlags)
      ? result.redFlags.slice(0, 8)
      : [],

    breakdown: Array.isArray(result.breakdown)
      ? result.breakdown.slice(0, 8)
      : [],

    verificationSteps: Array.isArray(result.verificationSteps)
      ? result.verificationSteps.slice(0, 8)
      : [],

    doNotShare: Array.isArray(result.doNotShare)
      ? result.doNotShare.slice(0, 8)
      : [],

    positiveSignals: Array.isArray(result.positiveSignals)
      ? result.positiveSignals.slice(0, 8)
      : [],

    limitations: Array.isArray(result.limitations)
      ? result.limitations.slice(0, 8)
      : []
  };
}


/* =========================================================
   List Rendering
   ========================================================= */

function renderList(items, emptyMessage = "None identified.") {
  if (!Array.isArray(items) || items.length === 0) {
    return `<li class="empty-item">${escapeHtml(emptyMessage)}</li>`;
  }

  return items
    .map((item) => {
      const text =
        typeof item === "string"
          ? item
          : item?.reason || item?.factor || "";

      return `
        <li>
          ${formatText(text)}
        </li>
      `;
    })
    .join("");
}


function renderBreakdown(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return `
      <div class="empty-state">
        No detailed breakdown was returned.
      </div>
    `;
  }

  return items
    .map((item) => {
      const factor = escapeHtml(
        item?.factor || "Risk factor"
      );

      const reason = escapeHtml(
        item?.reason || "No additional explanation provided."
      );

      const impact = clamp(
        item?.impact ?? 0,
        -100,
        100
      );

      return `
        <article class="breakdown-item">

          <div class="breakdown-header">
            <strong>${factor}</strong>

            <span>
              ${impact > 0 ? "+" : ""}
              ${impact}
            </span>
          </div>

          <p>${reason}</p>

        </article>
      `;
    })
    .join("");
}


/* =========================================================
   Result Rendering
   ========================================================= */

function renderResults(data) {
  const result = normalizeResult(data?.result);

  const score = result.threatScore;
  const riskClass = getRiskClass(score);
  const riskLabel = getRiskLabel(score);

  const domain =
    data?.meta?.domain || "Not provided";

  const domainAgeVerified =
    data?.meta?.domainAgeVerified === true;

  elements.result.innerHTML = `
    <div class="result-page">

      <div class="result-header">

        <div>
          <span class="section-kicker">
            ANALYSIS COMPLETE
          </span>

          <h1 id="result-title">
            ScamShield AI Assessment
          </h1>

          <p>
            ${formatText(result.summary)}
          </p>
        </div>

        <button
          type="button"
          class="scan-button compact"
          data-nav="scanner"
        >
          ← Scan another
        </button>

      </div>


      <section class="result-overview">

        <div class="score-card ${riskClass}">

          <span class="score-label">
            THREAT INDEX
          </span>

          <div class="score-value">
            ${score}
            <small>/100</small>
          </div>

          <div class="risk-badge">
            ${riskLabel}
          </div>

          <p>
            ${formatText(result.verdict)}
          </p>

        </div>


        <div class="confidence-card">

          <span class="section-kicker">
            AI CONFIDENCE
          </span>

          <strong>
            ${result.confidence}%
          </strong>

          <p>
            Confidence reflects how strongly the supplied
            evidence supports the assessment.
          </p>

        </div>


        <div class="domain-card">

          <span class="section-kicker">
            DOMAIN CONTEXT
          </span>

          <strong>
            ${formatText(domain)}
          </strong>

          <p>
            Domain age:
            ${
              domainAgeVerified
                ? "Verified"
                : "Not verified"
            }
          </p>

        </div>

      </section>


      <section class="result-grid">

        <article class="result-card danger-card">

          <div class="result-card-heading">
            <span aria-hidden="true">!</span>

            <div>
              <span class="section-kicker">
                WARNING SIGNALS
              </span>

              <h2>Red flags</h2>
            </div>
          </div>

          <ul class="result-list">
            ${renderList(
              result.redFlags,
              "No major red flags identified."
            )}
          </ul>

        </article>


        <article class="result-card">

          <div class="result-card-heading">
            <span aria-hidden="true">◎</span>

            <div>
              <span class="section-kicker">
                POSITIVE EVIDENCE
              </span>

              <h2>Positive signals</h2>
            </div>
          </div>

          <ul class="result-list">
            ${renderList(
              result.positiveSignals,
              "No strong positive signals identified."
            )}
          </ul>

        </article>


        <article class="result-card wide-card">

          <div class="result-card-heading">
            <span aria-hidden="true">◷</span>

            <div>
              <span class="section-kicker">
                EXPLAINABILITY
              </span>

              <h2>Risk breakdown</h2>
            </div>
          </div>

          <div class="breakdown-list">
            ${renderBreakdown(result.breakdown)}
          </div>

        </article>


        <article class="result-card">

          <div class="result-card-heading">
            <span aria-hidden="true">✓</span>

            <div>
              <span class="section-kicker">
                NEXT STEPS
              </span>

              <h2>How to verify</h2>
            </div>
          </div>

          <ol class="result-list numbered-list">
            ${renderList(
              result.verificationSteps,
              "No specific verification steps returned."
            )}
          </ol>

        </article>


        <article class="result-card danger-card">

          <div class="result-card-heading">
            <span aria-hidden="true">⌑</span>

            <div>
              <span class="section-kicker">
                PROTECTION
              </span>

              <h2>Do not share</h2>
            </div>
          </div>

          <ul class="result-list">
            ${renderList(
              result.doNotShare,
              "No sensitive information was specifically flagged."
            )}
          </ul>

        </article>


        <article class="result-card wide-card">

          <div class="result-card-heading">
            <span aria-hidden="true">?</span>

            <div>
              <span class="section-kicker">
                LIMITATIONS
              </span>

              <h2>What ScamShield cannot verify</h2>
            </div>
          </div>

          <ul class="result-list">
            ${renderList(
              result.limitations,
              "No additional limitations reported."
            )}
          </ul>

        </article>

      </section>


      <div class="result-disclaimer">

        <strong>
          Important:
        </strong>

        ScamShield provides automated defensive screening.
        A score does not prove that an offer is fraudulent or legitimate.
        Independently verify employers before paying or sharing sensitive
        information.

      </div>

    </div>
  `;

  showView("result");

  attachDynamicNavigation();
}


/* =========================================================
   Dynamic Navigation
   ========================================================= */

function attachDynamicNavigation() {
  elements.result
    ?.querySelectorAll("[data-nav]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        showView(button.dataset.nav);
      });
    });
}


/* =========================================================
   Scan Workflow
   ========================================================= */

async function handleScan() {
  if (state.isScanning) {
    return;
  }

  hideError();

  const input = getInput();

  const validationError = validateInput(input);

  if (validationError) {
    showError(validationError);
    return;
  }

  state.isScanning = true;

  setLoading(true);

  try {
    const data = await analyzeOffer(input);

    renderResults(data);

  } catch (error) {

    console.error("ScamShield scan failed:", error);

    showError(
      error?.message ||
      "The AI analysis failed. Please try again."
    );

  } finally {

    state.isScanning = false;

    setLoading(false);
  }
}


/* =========================================================
   Event Listeners
   ========================================================= */

function initializeEvents() {

  elements.offer?.addEventListener(
    "input",
    updateCharacterCount
  );

  elements.scanBtn?.addEventListener(
    "click",
    handleScan
  );

  initializeDemo();
  initializeErrorHandling();
  initializeNavigation();
}


/* =========================================================
   Initialization
   ========================================================= */

function initializeApp() {

  // Hide non-active views initially.
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = !view.classList.contains("active");
  });

  updateCharacterCount();

  hideError();

  initializeEvents();

  console.log("ScamShield AI initialized.");
}


document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);