<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (Planliyo web)

- Verify with `npx eslint .` and `npx next build`. Local Playwright: the bundled browser may be missing, so run with system Chrome via a config that sets `use.channel = 'chrome'` (e.g. `PLAYWRIGHT_BASE_URL=http://localhost:3100 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test -c <config>`). `tests/exam-analysis.spec.js` needs a disposable `QA_EMAIL` / `QA_PASSWORD` account.
- Deneme (mock exam) catalog lives in the `exam_types` table (TYT/AYT/YDT use the curriculum and `create_exam_with_details`; KDS, SDS, LGS, KPSS_GYGK, ALES, DGS, YDS, YOKDIL, MSU, DIGER use `create_exam_result`). Add new exams with a migration row, not app code. Shared rules (net per penalty, normalisation, combined/per-type/per-subject analysis) are in `lib/exams/catalog.js` and are used by web and mobile. `deneme_detaylari` rows carry `section_key/section_label/question_count/wrong_penalty`; the `net` generated column follows `wrong_penalty` (0 = no penalty).
- Dashboard, statistics and goals stay YKS-only by filtering `sinav_turu` with `YKS_EXAM_CODES`; only Deneme Analizi shows every exam type.
- Dashboard dark theme: preference in localStorage `calisiyo-theme` (applied before paint by `THEME_BOOT_SCRIPT` in `lib/theme.js`, scoped to `/dashboard`). Use the `--study-*` tokens in `app/dashboard/study.css`; legacy hard-coded colours were converted to `light-dark(light, dark)`, which follows `color-scheme`. Never hard-code light-only colours in dashboard styles or inline JSX styles.
- The domain-change notice (`components/brand/DomainNotice.js`) is website-only (landing + dashboard), dismissible, hidden before paint via `data-domain-notice`.
- Landing page: `components/landing/LandingPage.js` + `app/landing.css` (scoped `.lp`). FAQ copy in `components/landing/SharedLandingContent.js` also feeds FAQPage JSON-LD and `/llms.txt`.
- Production CSP has no `'unsafe-eval'` (development only). Do not add `upgrade-insecure-requests` (breaks local http QA).
