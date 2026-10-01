# Green Box -- Platform (dashboard, marketplace, AI tools)

Next.js app scaffolded in Firebase Studio, using Genkit for the
AI-assisted tools and Firestore for data. See the top-level repo README
for how this fits with `firmware/` and `ml-model/`.

## AI model now runs locally, not on Google's cloud

As of this revision, the AI tools (chat assistant, problem diagnosis,
part prediction, supplier recommendation) call a **locally-run Ollama
server** instead of Google's Gemini API. `@genkit-ai/google-genai` has
been removed from `package.json` entirely, and `src/ai/genkit.ts` no
longer makes any outbound call to a Google AI endpoint -- prompts and
whatever industrial data they contain never leave the machine (or
on-prem server) Ollama runs on.

**Setup:**
```bash
# 1. Install Ollama: https://ollama.com
# 2. Pull a model capable of following structured JSON output reasonably well:
ollama pull llama3.1
# 3. (optional) point at a different server/model:
export OLLAMA_SERVER_ADDRESS=http://127.0.0.1:11434
export OLLAMA_MODEL=llama3.1
# 4. Run as normal:
npm install
npm run dev
```

**Real tradeoffs, stated plainly, not glossed over:**
- **Quality**: a locally-run 8B model like `llama3.1` is noticeably less
  reliable than Gemini 2.5 Flash at following the strict JSON schemas
  these flows require (`ai.definePrompt`'s `output: {schema}`). Test the
  four AI tools after switching and expect occasional malformed
  responses that Gemini rarely produced -- this is a real capability
  gap, not just a config difference.
- **Hardware**: an 8B model needs a real GPU or a lot of RAM to run at
  usable latency. A live demo on underpowered hardware may be slow.
  Smaller models (`llama3.2:3b`, `gemma2:2b`) run on modest hardware but
  will be less reliable still at the structured-output task.
- **Deployment**: this now requires *something* running Ollama --
  either the demo machine itself, or an on-prem server reachable at
  `OLLAMA_SERVER_ADDRESS`. There's no managed cloud fallback anymore.

**If you decide local quality isn't good enough for a live demo**, an
official `genkit-plugin-anthropic` package exists (Claude via
Anthropic's API) as a middle ground: not Google, and generally more
reliable at structured output than a small local model, but still a
cloud API call to a third party rather than fully local. Swapping to it
is a small, contained change to `src/ai/genkit.ts` alone -- the flow
files (`src/ai/flows/*.ts`) don't need to change either way, since they
only depend on `ai` from `./genkit`, not on which plugin backs it.

**What this change does NOT touch**: Firestore and Firebase
Authentication are still in use (`src/firebase/`), and both are Google
Cloud products. Removing those would mean replacing the database and
auth system entirely -- a much larger change than swapping the model
backend, and one this revision does not attempt. If full independence
from Google infrastructure (not just the AI model) is the actual goal,
that's a separate, bigger piece of work worth scoping deliberately
rather than doing implicitly.

```bash
npm install
npm run dev
```

## What changed in this revision, and why

This revision addressed three real issues found during review, not just
cosmetic changes:

**1. Firestore rules were wide open on sensitive collections.**
`orders`, `equipment_failure_predictions`, and `Critical_Alerts` were
previously readable by anyone on the internet (`allow get, list: if
true`), no auth required. That's a real exposure for a product whose
pitch includes ports and disaster response -- publicly broadcasting
which specific assets are flagged as failing is not something to leave
open. `firestore.rules` now requires an authenticated session (anonymous
auth is enough) for those three collections; `spare_parts` and
`suppliers` stay public since they're the marketplace catalog, not
sensitive data. `src/firebase/client-provider.tsx` now signs every
visitor in anonymously on load so this doesn't add login friction to
the demo.

**2. The AI flows fabricated numbers with nothing to check them
against.** `recommend-efficient-supplier.ts` previously asked Gemini to
invent a supplier name, delivery route, and cost from nothing -- even
though real sample supplier data already existed in `src/lib/data.ts`
and was never passed in. It now looks up real candidate suppliers for
the requested part first and restricts the model to choosing and
explaining among those real rows, returning `grounded: false` (an
honest "no match" response) instead of a fabricated answer when there
isn't one. Similarly, `predictive-part-identification.ts` previously
asked for a numeric `confidenceLevel` (0-1) with no model behind it --
that's now a qualitative `confidenceRating` (low/medium/high) plus an
explicit user-facing disclaimer that this is an AI hypothesis for a
technician to verify, not a calibrated prediction.

**3. The purchase-order flow didn't persist anything.**
`purchase-order-dialog.tsx` previously just showed a success toast with
no Firestore write -- "confirmed" orders didn't exist anywhere, and the
old rules blocked client writes to `orders` entirely anyway. It now
writes a real order document via the existing `addDocumentNonBlocking`
helper, scoped to the signed-in (anonymous) user's uid, validated by the
updated Firestore rules.

**4. Arabic/Spanish support didn't reach three of the four AI tools.**
Only the conversational chat flow accepted a `language` parameter; the
diagnosis, part-prediction, and supplier-recommendation tools always
responded in English regardless of the UI language selector. All four
flows and their forms now thread `language` through from
`useLanguage()`.

## Known issues not addressed in this pass

Running `npx tsc --noEmit` surfaces 5 pre-existing type errors unrelated
to the above (a stray incorrect import in `src/firebase/index.ts`, and
a couple of `DashboardStat`/translations typing gaps in `page.tsx`,
`stats-card.tsx`, and `header.tsx`). `next.config.ts` has
`typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds:
true`, so these don't block `npm run build` -- but they're real gaps in
type safety worth cleaning up before relying on strict typing to catch
future regressions.

## Still sample/demo data, not a live backend

`src/lib/data.ts` (parts, suppliers, pricing) is illustrative sample
data, not a live supplier database or connected to real sensor feeds.
Positioning this honestly -- "the AI tools are real, the catalog data
behind them is a demo dataset" -- is the same discipline the rest of
this repo already applies to the firmware and ML tiers.

## Currency note

Prices in `src/lib/data.ts` are unlabeled numbers, implicitly USD given
the sample suppliers (Germany, Japan, USA, Netherlands). If this is
being positioned specifically for the Egyptian market, that's worth
addressing deliberately -- either add real EGP pricing/suppliers, or
keep USD but state that explicitly in the UI, rather than leaving the
currency ambiguous.
