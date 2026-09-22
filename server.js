const http = require("http");
const fs = require("fs");
const path = require("path");

const analyzeHandler = require("./api/analyze");

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
      });

      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "Content-Type":
        MIME_TYPES[extension] || "application/octet-stream",
    });

    res.end(data);
  });
}

function sendJson(res, statusCode, data) {
  if (res.headersSent) return;

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });

  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  /*
   * ==============================
   * AI ANALYSIS API
   * ==============================
   */
  if (
    requestUrl.pathname === "/api/analyze" &&
    req.method === "POST"
  ) {
    let chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", async () => {
      try {
        const rawBody = Buffer.concat(chunks).toString("utf8");

        console.log("\n--- Incoming AI request ---");
        console.log("Body length:", rawBody.length);

        let body;

        try {
          body = rawBody ? JSON.parse(rawBody) : {};
        } catch (parseError) {
          console.error("JSON parsing failed:", parseError.message);

          return sendJson(res, 400, {
            error: "Invalid JSON request body.",
          });
        }

        console.log("Offer text received:", Boolean(body.offerText));
        console.log("URL received:", Boolean(body.url));

        /*
         * Vercel-style request object
         */
        req.body = body;

        await analyzeHandler(req, res);
      } catch (error) {
        console.error("API ERROR:", error);

        sendJson(res, 500, {
          error: "Internal server error.",
        });
      }
    });

    return;
  }

  /*
   * ==============================
   * STATIC FRONTEND
   * ==============================
   */

  if (req.method !== "GET") {
    return sendJson(res, 404, {
      error: "Not found.",
    });
  }

  let requestedPath;

  try {
    requestedPath = decodeURIComponent(requestUrl.pathname);
  } catch {
    return sendJson(res, 400, {
      error: "Invalid URL.",
    });
  }

  if (requestedPath === "/") {
    requestedPath = "/index.html";
  }

  const safePath = path.normalize(
    path.join(ROOT, requestedPath)
  );

  /*
   * Prevent path traversal.
   */
  if (
    safePath !== ROOT &&
    !safePath.startsWith(ROOT + path.sep)
  ) {
    return sendJson(res, 403, {
      error: "Forbidden.",
    });
  }

  sendFile(res, safePath);
});

server.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("          SCAMSHIELD AI");
  console.log("======================================");
  console.log(`Local app: http://localhost:${PORT}`);
  console.log(`AI API:    http://localhost:${PORT}/api/analyze`);
  console.log("");
  console.log("API key remains server-side.");
  console.log("Press Ctrl+C to stop.");
  console.log("======================================");
  console.log("");
});