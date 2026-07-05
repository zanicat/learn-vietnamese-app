/* Cloudflare Worker twin of server.js — the deployable Gemini lookup proxy.
   Same contract:  POST /api/lookup {"text": "..."} -> {vi, en, note, literal, model}

   Deploy (free Cloudflare account + Node for npx):
     npx wrangler login
     npx wrangler secret put GEMINI_API_KEY     <- paste your key when prompted
     npx wrangler deploy
   Then paste the printed URL into LOOKUP_DEPLOYED in index.html
   (keep the /api/lookup path).

   Keep the prompt/schema here in sync with server.js. */

var DEFAULT_MODEL = "gemini-2.5-flash";

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

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(code, obj) {
  var headers = corsHeaders();
  headers["Content-Type"] = "application/json; charset=utf-8";
  return new Response(JSON.stringify(obj), { status: code, headers: headers });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    var model = (env && env.GEMINI_MODEL) || DEFAULT_MODEL;
    if (request.method === "GET") {
      return json(200, { ok: true, service: "tungtu-lookup", keyConfigured: !!(env && env.GEMINI_API_KEY), model: model });
    }
    var pathname = new URL(request.url).pathname.replace(/\/+$/, "");
    if (request.method !== "POST" || pathname !== "/api/lookup") {
      return json(404, { error: "POST /api/lookup is the only endpoint here." });
    }
    if (!env || !env.GEMINI_API_KEY) {
      return json(500, { error: "GEMINI_API_KEY secret is not set — run: npx wrangler secret put GEMINI_API_KEY" });
    }
    var text;
    try { text = String((await request.json()).text || ""); }
    catch (e) { return json(400, { error: "Body must be JSON like {\"text\":\"...\"}." }); }
    text = text.trim();
    if (!text) return json(400, { error: "Nothing to translate." });
    if (text.length > 200) return json(400, { error: "Keep lookups under 200 characters." });

    var base = env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
    try {
      var r = await fetch(base + "/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: text }] }],
          systemInstruction: { parts: [{ text: PROMPT }] },
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA
          }
        })
      });
      var body = await r.json();
      if (r.status !== 200) {
        var msg = (body && body.error && body.error.message) || ("Gemini returned HTTP " + r.status);
        return json(502, { error: msg, upstreamStatus: r.status });
      }
      var out = JSON.parse(body.candidates[0].content.parts[0].text);
      if (!out.vi || !out.en) throw new Error("missing fields");
      return json(200, {
        vi: String(out.vi), en: String(out.en),
        note: String(out.note || ""), literal: String(out.literal || ""), model: model
      });
    } catch (e) {
      return json(502, { error: "Gemini answered in an unexpected shape — try again." });
    }
  }
};
