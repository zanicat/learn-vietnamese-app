# Từng từ — Vietnamese, word by word

A self-contained Vietnamese tutor for beginners. Everything lives in `index.html`:
open it in any browser (double-click, or `explorer.exe index.html` from WSL).

- Your flashcard deck and review history are saved in the browser's localStorage —
  same browser + same file location = progress persists across sessions.
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
- No server, no accounts. To back up progress, use Progress-tab data before
  "Erase all progress"; to move machines, just re-add words.
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
