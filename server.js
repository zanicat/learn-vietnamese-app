#!/usr/bin/env node
"use strict";
/* Tiny lookup proxy for Từng từ.
   Holds the Gemini API key server-side (env var or .env file) and exposes
   one endpoint the single-file frontend can call:

     POST /api/lookup   { "text": "how do I say cheers" }
     ->                 { "vi": "một hai ba, dô!", "en": "...", "note": "...", "literal": "..." }

   Zero dependencies — needs only Node 18+ (built-in http + fetch).
   Run:  node server.js     (reads GEMINI_API_KEY from the environment,
                             or from a .env file next to this script)
   The key never reaches the browser; never commit a real .env. */

var http = require("http");
var fs = require("fs");
var path = require("path");

/* read KEY=VALUE lines from .env beside this file, without overriding
   anything already set in the environment */
(function loadDotEnv() {
  try {
    fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)
      .forEach(function (line) {
        var m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && !(m[1] in process.env)) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      });
  } catch (e) { /* no .env — fine, env vars may be set directly */ }
})();

var PORT = Number(process.env.PORT || 8787);
var KEY = process.env.GEMINI_API_KEY || "";
var MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
/* override in tests to point at a stub upstream */
var BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

var PROMPT =
  "You are the dictionary behind a beginner's Vietnamese phrasebook app that " +
  "teaches everyday spoken Vietnamese, southern (Saigon) usage, addressing " +
  "strangers politely. Translate the user's text. If it is English, give the " +
  "most natural spoken Vietnamese (full diacritics). If it is Vietnamese, " +
  "give the natural English meaning. Fill the JSON fields: " +
  "vi = the Vietnamese (with diacritics); en = the English; " +
  "note = one short, friendly usage or politeness tip a beginner needs, or \"\" ; " +
  "literal = word-by-word gloss if the Vietnamese is multi-word, else \"\". " +
  "No markdown, no extra keys.";

var RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    vi: { type: "STRING" },
    en: { type: "STRING" },
    note: { type: "STRING" },
    literal: { type: "STRING" }
  },
  required: ["vi", "en"]
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*"); /* file:// pages send Origin: null */
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function send(res, code, obj) {
  cors(res);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function lookup(text, done) {
  var url = BASE + "/v1beta/models/" + MODEL + ":generateContent";
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: text }] }],
      systemInstruction: { parts: [{ text: PROMPT }] },
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    })
  }).then(function (r) {
    return r.json().then(function (body) { return { status: r.status, body: body }; });
  }).then(function (r) {
    if (r.status !== 200) {
      var msg = (r.body && r.body.error && r.body.error.message) || ("Gemini returned HTTP " + r.status);
      return done({ error: msg, upstreamStatus: r.status });
    }
    try {
      var part = r.body.candidates[0].content.parts[0].text;
      var out = JSON.parse(part);
      if (!out.vi || !out.en) throw new Error("missing fields");
      done(null, { vi: String(out.vi), en: String(out.en),
        note: String(out.note || ""), literal: String(out.literal || ""), model: MODEL });
    } catch (e) {
      done({ error: "Gemini answered in an unexpected shape — try again." });
    }
  }).catch(function (e) {
    done({ error: "Could not reach Gemini: " + e.message });
  });
}

var server = http.createServer(function (req, res) {
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }
  if (req.method === "GET") {
    send(res, 200, { ok: true, service: "tungtu-lookup", keyConfigured: !!KEY, model: MODEL });
    return;
  }
  if (req.method !== "POST" || req.url.replace(/\/+$/, "") !== "/api/lookup") {
    send(res, 404, { error: "POST /api/lookup is the only endpoint here." });
    return;
  }
  if (!KEY) {
    send(res, 500, { error: "GEMINI_API_KEY is not set on the server. Put it in vietnamese-tutor/.env (see .env.example) and restart." });
    return;
  }
  var chunks = [], size = 0;
  req.on("data", function (c) {
    size += c.length;
    if (size > 4096) { send(res, 413, { error: "Request too large." }); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", function () {
    var text;
    try { text = String(JSON.parse(Buffer.concat(chunks).toString("utf8")).text || ""); }
    catch (e) { send(res, 400, { error: "Body must be JSON like {\"text\":\"...\"}." }); return; }
    text = text.trim();
    if (!text) { send(res, 400, { error: "Nothing to translate." }); return; }
    if (text.length > 200) { send(res, 400, { error: "Keep lookups under 200 characters." }); return; }
    lookup(text, function (err, out) {
      if (err) send(res, 502, err);
      else send(res, 200, out);
    });
  });
});

server.listen(PORT, function () {
  console.log("Từng từ lookup proxy on http://localhost:" + PORT +
    "  (key " + (KEY ? "configured" : "MISSING — set GEMINI_API_KEY") + ", model " + MODEL + ")");
});
