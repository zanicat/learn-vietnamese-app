# Từng từ — Vietnamese, word by word

A self-contained Vietnamese tutor for beginners. Everything lives in `index.html`:
open it in any browser (double-click, or `explorer.exe index.html` from WSL).

- Your flashcard deck and review history are saved in the browser's localStorage —
  same browser + same file location = progress persists across sessions.
- **Daily lessons:** the Today tab holds a four-week curriculum of short
  scenario lessons (ordering food, haggling, taxi directions, …) built from the
  phrasebook. Finishing a lesson drops its words into the flashcard deck, and
  completed scenes can be replayed from Today or after a review session.
  Trâu, the resident water buffalo, keeps an eye on your streak.
- **Phrase building:** searches that combine known pieces ("where is the
  pharmacy", "two beers", "I'm so hungry", "coffee no ice") are composed into
  full sentences with correct Vietnamese word order — each supported sentence
  pattern mirrors a construction the phrasebook itself demonstrates, and slots
  only accept words whose grammatical role is known. Combinations outside
  those vetted patterns are refused with an explanation instead of guessed,
  because gluing dictionary entries together does not produce correct
  Vietnamese. This is deliberately client-side and offline: the app deploys
  to public GitHub Pages, so any translation API key would be visible in the
  source, and keyless machine-translation endpoints can't say "I don't know" —
  they'd silently return wrong Vietnamese.
- No server or accounts needed for the core app. To back up progress, use
  Progress-tab data before "Erase all progress"; to move machines, just
  re-add words.
- **Gemini lookup (optional):** anything the phrasebook doesn't know can be
  asked of Gemini from the Learn tab. Because the app is a public client-side
  page, the API key never lives in the frontend — lookups go through a proxy
  that holds the key. Two interchangeable proxies ship in this repo, and the
  page automatically tries the right one for where it's running (localhost
  first when opened locally, the Worker first on the deployed site):
  - **Local (`server.js`, zero-dependency Node 18+):**
    1. `cp .env.example .env` and paste your key from
       https://aistudio.google.com/apikey (`.env` is gitignored).
    2. `node server.js` — listens on `http://localhost:8787`.
  - **Deployed (`worker.js`, Cloudflare Worker — free tier, needs a free
    Cloudflare account):** on WSL, always go through `./deploy-worker.sh` —
    plain `npx wrangler` fails there, because npx resolves to Windows Node,
    which can't run from a WSL directory (the script stages the worker into a
    Windows-side folder first).
    1. `./deploy-worker.sh login` (one-time browser sign-in).
    2. `./deploy-worker.sh deploy` — prints your Worker URL, e.g.
       `https://tungtu-lookup.<your-subdomain>.workers.dev`.
    3. `./deploy-worker.sh secret put GEMINI_API_KEY` — paste your key when
       asked; it's stored encrypted on Cloudflare, not in the repo.
    4. Paste the Worker URL into `LOOKUP_DEPLOYED` near the top of the script
       in `index.html`, keeping the `/api/lookup` path.
  Without any proxy running, the rest of the app is unaffected — lookups just
  explain how to start one. If you change the shared prompt, keep `server.js`
  and `worker.js` in sync.
- **Accent:** phonetic guides, tone contours, and the tone guide teach
  **Saigon (southern)** pronunciation by default — d/gi = "y", r = r, s = "sh",
  tr keeps its r-color, and the hỏi/ngã tones merge. A toggle in the footer
  (and in the tone guide) switches to Hanoi (northern).
- Audio prefers a locally installed Vietnamese voice and otherwise streams
  Google's Vietnamese TTS. **Both speak with a Hanoi accent** — no free
  southern-accented voice exists — so where audio and the written guide differ
  (d, gi, r, s, tr, ngã), trust the written guide; tones, vowels, and rhythm
  transfer fine. On Windows you can install a local voice via Settings →
  Time & Language → Speech → Add voices → Tiếng Việt.
