const $ = (selector) => document.querySelector(selector)

const offer = $('#offer')
const url = $('#url')
const scanBtn = $('#scanBtn')
const demoBtn = $('#demoBtn')
const resultView = $('#result')
const errorBox = $('#errorBox')
const errorText = $('#errorText')
let scanInProgress = false

const DEMO_OFFER = `Congratulations! You have been selected for the Senior Operations Executive role. Your salary will be ₹8,40,000 per year. To complete your joining formalities, please pay a refundable equipment and registration fee of ₹4,999 within the next 2 hours. You are guaranteed placement and no interview is required. Send your Aadhaar card, PAN card and bank details to hr.recruitment@career-fast-jobs.example. Failure to pay today will cancel your appointment.`

const DEMO_URL = 'https://career-fast-jobs.example/apply'


// ------------------------------------------------------------
// Navigation
// ------------------------------------------------------------

function showView(id) {
  document
    .querySelectorAll('.view')
    .forEach((view) => {
      view.classList.toggle('active', view.id === id)
    })

  document
    .querySelectorAll('[data-nav]')
    .forEach((button) => {
      button.classList.toggle(
        'nav-active',
        button.dataset.nav === id
      )
    })

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]')

  if (nav) {
    showView(nav.dataset.nav)
  }
})


// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function showError(message) {
  errorText.textContent = message
  errorBox.classList.remove('hidden')
}

function hideError() {
  errorBox.classList.add('hidden')
}

function esc(value) {
  return String(value ?? '')
    .replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[character]
    )
}

function scoreClass(score) {
  const value = Number(score) || 0

  if (value >= 80) return 'critical'
  if (value >= 60) return 'high'
  if (value >= 35) return 'medium'

  return 'low'
}

function iconFor(severity) {
  const value = String(severity || '').toUpperCase()

  if (value === 'CRITICAL' || value === 'HIGH') return '!'
  if (value === 'MEDIUM') return '△'

  return '?'
}

function safeScore(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) return 0

  return Math.min(100, Math.max(0, number))
}


// ------------------------------------------------------------
// Character counter
// ------------------------------------------------------------

offer.addEventListener('input', () => {
  charCount.textContent =
    `${offer.value.length.toLocaleString()} / 18,000 characters`
})


// ------------------------------------------------------------
// Demo
// ------------------------------------------------------------

demoBtn.addEventListener('click', () => {
  offer.value = DEMO_OFFER
  url.value = DEMO_URL

  charCount.textContent =
    `${offer.value.length.toLocaleString()} / 18,000 characters`

  hideError()

  showView('scanner')
})


// ------------------------------------------------------------
// Error close
// ------------------------------------------------------------

$('#errorClose').addEventListener('click', hideError)


// ------------------------------------------------------------
// Scan
// ------------------------------------------------------------

scanBtn.addEventListener('click', async () => {
  // Prevent duplicate requests
  if (scanInProgress) return

  hideError()

  // Validate before locking the scan
  if (
    offer.value.trim().length < 30 &&
    url.value.trim().length < 5
  ) {
    showError(
      'Paste an offer message or add a URL before scanning.'
    )
    return
  }

  scanInProgress = true
  scanBtn.disabled = true

  scanBtn.innerHTML =
    '<span class="spinner"></span> Analyzing evidence...'

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        offerText: offer.value,
        url: url.value
      })
    })

    let data

    try {
      data = await response.json()
    } catch {
      throw new Error(
        'The server returned an invalid response.'
      )
    }

    if (!response.ok) {
      throw new Error(
        data.error || 'Scan failed.'
      )
    }

    if (!data.result) {
      throw new Error(
        'The AI returned an unexpected response format.'
      )
    }

    renderResult({
      ...data.result,
      meta: data.meta || {}
    })

    showView('result')

  } catch (error) {
    console.error('Scan error:', error)

    showError(
      error.message ||
      'Unable to scan this submission.'
    )

  } finally {
    scanBtn.disabled = false
    scanInProgress = false

    scanBtn.innerHTML =
      '⌕ Analyze with ScamShield AI <span>→</span>'
  }
})


// ------------------------------------------------------------
// Render result
// ------------------------------------------------------------

function renderResult(result) {

  const threatScore = safeScore(result.threatScore)
  const confidence = safeScore(result.confidence)
  const tone = scoreClass(threatScore)

  // ----------------------------------------------------------
  // RED FLAGS
  // ----------------------------------------------------------

  const flags = (result.redFlags || [])
    .map((flag) => {

      // Current backend returns strings
      if (typeof flag === 'string') {

  const text = flag.toLowerCase()

  let category = 'Suspicious Activity'

  if (
    text.includes('payment') ||
    text.includes('fee') ||
    text.includes('money')
  ) {
    category = 'Upfront Payment Demand'
  }
  else if (
    text.includes('interview') ||
    text.includes('guaranteed placement') ||
    text.includes('no interview')
  ) {
    category = 'No Interview / Guaranteed Job'
  }
  else if (
    text.includes('aadhaar') ||
    text.includes('pan') ||
    text.includes('bank') ||
    text.includes('identity') ||
    text.includes('document')
  ) {
    category = 'Sensitive Documents Requested'
  }
  else if (
    text.includes('hour') ||
    text.includes('deadline') ||
    text.includes('urgent') ||
    text.includes('immediately')
  ) {
    category = 'Artificial Urgency'
  }
  else if (
    text.includes('email') ||
    text.includes('domain') ||
    text.includes('website') ||
    text.includes('recruiter')
  ) {
    category = 'Recruitment Identity Concern'
  }

  return `
    <article class="flag high">

      <div class="flag-icon">
        !
      </div>

      <div>

        <div class="flag-heading">

          <strong>
            ${esc(category)}
          </strong>

          <span>
            DETECTED
          </span>

        </div>

        <p>
          ${esc(flag)}
        </p>

      </div>

    </article>
  `
}

      // Supports object-based responses too
      const severity =
        String(
          flag?.severity || 'HIGH'
        ).toUpperCase()

      const category =
        flag?.category ||
        flag?.title ||
        flag?.factor ||
        'Risk signal'

      const evidence =
        flag?.evidence || ''

      const explanation =
        flag?.explanation ||
        flag?.reason ||
        flag?.description ||
        ''

      return `
        <article class="flag ${severity.toLowerCase()}">

          <div class="flag-icon">
            ${iconFor(severity)}
          </div>

          <div>

            <div class="flag-heading">

              <strong>
                ${esc(category)}
              </strong>

              <span>
                ${esc(severity)}
              </span>

            </div>

            ${
              evidence
                ? `
                  <p class="evidence">
                    “${esc(evidence)}”
                  </p>
                `
                : ''
            }

            <p>
              ${esc(explanation)}
            </p>

          </div>

        </article>
      `
    })
    .join('')


  const flagsHtml =
    flags ||
    `
      <div class="empty-result">
        ✓ No major red flags were identified from the available evidence.
      </div>
    `


  // ----------------------------------------------------------
  // THREAT BREAKDOWN
  // Backend:
  // {
  //   factor: "...",
  //   impact: 80,
  //   reason: "..."
  // }
  // ----------------------------------------------------------

  const breakdown = (result.breakdown || [])
    .map((item) => {

      const category =
        item?.factor ||
        item?.category ||
        item?.title ||
        item?.label ||
        'Risk factor'

      const score = safeScore(
        item?.impact ??
        item?.score ??
        item?.weight ??
        0
      )

      const reason =
        item?.reason ||
        item?.description ||
        ''

      return `
        <div class="breakdown-item">

          <div>

            <span>
              ${esc(category)}
            </span>

            <strong>
              ${score}
            </strong>

          </div>

          <div class="bar">

            <i
              style="width:${score}%"
            ></i>

          </div>

          <p>
            ${esc(reason)}
          </p>

        </div>
      `
    })
    .join('')


  const breakdownHtml =
    breakdown ||
    `
      <div class="empty-result">
        No threat breakdown was returned.
      </div>
    `


  // ----------------------------------------------------------
  // VERIFICATION
  // ----------------------------------------------------------

  const verification =
    (result.verificationSteps || [])
      .map(
        (item, index) => `
          <li>

            <span>
              ${index + 1}
            </span>

            ${esc(item)}

          </li>
        `
      )
      .join('')


  const verificationHtml =
    verification ||
    `
      <li>

        <span>
          1
        </span>

        Verify the employer through an independently found official channel.

      </li>
    `


  // ----------------------------------------------------------
  // DON'T SHARE
  // ----------------------------------------------------------

  const dontShare =
    (result.doNotShare || [])
      .map(
        (item) => `
          <li>

            <span>
              !
            </span>

            ${esc(item)}

          </li>
        `
      )
      .join('')


  const dontShareHtml =
    dontShare ||
    `
      <li>

        <span>
          !
        </span>

        Do not share sensitive identity, banking or authentication information.

      </li>
    `


  // ----------------------------------------------------------
  // LIMITATIONS
  // ----------------------------------------------------------

  const limitations =
    (result.limitations || [])
      .map(
        (item) => `
          <li>
            ${esc(item)}
          </li>
        `
      )
      .join('')


  const limitationsHtml =
    limitations ||
    `
      <li>
        No additional limitations were returned.
      </li>
    `


  // ----------------------------------------------------------
  // DOMAIN
  // ----------------------------------------------------------

  const domain =
    result.meta?.domain ||
    'No domain supplied'


  const domainAgeVerified =
    result.meta?.domainAgeVerified === true


  const rdap =
    domainAgeVerified
      ? 'Domain age verified'
      : 'Domain age not verified'


  // ----------------------------------------------------------
  // SCORE RING
  // ----------------------------------------------------------

  const ringDegrees =
    Math.min(
      360,
      threatScore * 3.6
    )


  // ----------------------------------------------------------
  // RESULT PAGE
  // ----------------------------------------------------------

  resultView.innerHTML = `

    <section class="result-page">


      <div class="result-topline">

        <div>

          <span class="section-kicker">
            SCAN COMPLETE
          </span>

          <h1>
            Your risk picture
          </h1>

          <p>
            ScamShield found the signals below
            in the submitted material.
          </p>

        </div>


        <button
          class="ghost-button"
          id="newScan"
        >
          ↻ New scan
        </button>

      </div>



      <!-- SCORE -->

      <div class="score-panel ${tone}">

        <div
          class="score-ring"
          style="--score:${ringDegrees}deg"
        >

          <div>

            <strong>
              ${threatScore}
            </strong>

            <span>
              /100
            </span>

          </div>

        </div>


        <div class="score-copy">

          <span
            class="risk-chip ${tone}"
          >
            ${esc(
              result.riskLevel ||
              'unknown'
            )}
          </span>


          <h2>
            ${esc(
              result.verdict ||
              'Analysis complete'
            )}
          </h2>


          <p>
            ${esc(
              result.summary ||
              'The submitted material was analyzed for scam indicators.'
            )}
          </p>


          <div class="confidence">

            <span>
              Analysis confidence
            </span>

            <strong>
              ${confidence}%
            </strong>

            <div>

              <i
                style="width:${confidence}%"
              ></i>

            </div>

          </div>

        </div>

      </div>



      <!-- RED FLAGS + BREAKDOWN -->

      <div class="result-grid">


        <!-- RED FLAGS -->

        <section class="result-card">

          <div class="result-card-title">

            <span>
              △ Red flags
            </span>

            <small>
              ${result.redFlags?.length || 0}
              detected
            </small>

          </div>


          <div class="flag-list">
            ${flagsHtml}
          </div>

        </section>



        <!-- THREAT BREAKDOWN -->

        <section class="result-card">

          <div class="result-card-title">

            <span>
              ϟ Threat breakdown
            </span>

            <small>
              Evidence-weighted view
            </small>

          </div>


          <div class="breakdown-list">
            ${breakdownHtml}
          </div>

        </section>

      </div>



      <!-- RECOMMENDATIONS -->

      <div class="recommend-grid">


        <!-- VERIFY -->

        <section class="recommend-card safe">

          <div class="recommend-title">

            <span>
              ✓
            </span>

            <h3>
              Verify before you trust
            </h3>

          </div>


          <ul>
            ${verificationHtml}
          </ul>

        </section>



        <!-- DON'T SHARE -->

        <section class="recommend-card danger">

          <div class="recommend-title">

            <span>
              !
            </span>

            <h3>
              Don't share yet
            </h3>

          </div>


          <ul>
            ${dontShareHtml}
          </ul>

        </section>

      </div>



      <!-- LIMITATIONS -->

      <div class="limitations-card">

        <div>

          ⓘ

          <strong>
            What ScamShield could not verify
          </strong>

        </div>


        <ul>
          ${limitationsHtml}
        </ul>

      </div>



      <!-- META -->

      <div class="scan-meta">

        <span>
          ◎ ${esc(domain)}
        </span>

        <span>
          ⌕ ${esc(rdap)}
        </span>

        <span>
          ✦ Google Gemini analysis
        </span>

      </div>


    </section>

  `


  // ----------------------------------------------------------
  // NEW SCAN
  // ----------------------------------------------------------

  const newScanButton = $('#newScan')


  if (newScanButton) {

    newScanButton.addEventListener(
      'click',
      () => {

        showView('scanner')

        resultView.innerHTML = ''

      }
    )

  }
}