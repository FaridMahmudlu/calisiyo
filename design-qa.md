# Design QA

- Source visual truth: `design-references/selected-option-3-gunluk-program.png`
- Source native pixels: 1487 × 1058
- Normalized comparison viewport: 1440 × 1024 CSS px, device scale factor 1
- Implementation URL: `http://127.0.0.1:3100/dashboard/gunluk-program`
- Implementation screenshot: `design-references/qa/gunluk-program-desktop.png`
- Combined comparison: `design-references/qa/final-gunluk-program-comparison.png`
- Mobile evidence: `design-references/qa/gunluk-program-mobile.png` and `design-references/qa/mobile-navigation-open.png`
- State: authenticated daily-program screen backed by temporary synthetic Supabase data

## Full-view comparison evidence

The source and implementation were normalized to the same 1440 × 1024 viewport and rendered together in one 2000 × 711 comparison image. The final implementation matches the selected concept's desktop composition: narrow left navigation, title and primary action, segmented exam control, centered date control, seven-card week rail, three-column summary, and timeline task rows.

## Comparison points

1. Sidebar width, white surface, green active row, grouped labels, brand placement, and bottom account block align with the selected concept. The implementation intentionally keeps every legacy route.
2. Page title and `Görev ekle` action occupy the same top-row positions and use the same emerald/slate hierarchy.
3. TYT/AYT segments, centered date, and seven independent day cards match the reference's spacing, radii, and selected-state treatment.
4. The summary spans the same content width and preserves the three-part progress/time/completion structure while using live values.
5. Timeline, time labels, status nodes, task cards, duration pills, completion control, edit, and delete actions follow the same density and alignment.
6. The 390 × 844 capture confirms the responsive header, stacked summary, task actions, bottom navigation, and open drawer without clipping or horizontal overflow.

## Copy and data differences

- Reference copy: three illustrative tasks and a shortened navigation list.
- Implementation copy: five temporary QA tasks and all thirteen legacy routes. Values are intentionally generated from real database rows rather than hard-coded mock metrics.
- The reference's decorative progress ring is represented by the live percentage plus the shared icon treatment; this does not change the information hierarchy or interaction path.

## Interaction verification

- Email registration form: validation, password confirmation, area selection, immediate account creation, authenticated redirect, and logout tested.
- Email/password login: tested against a temporary confirmed Supabase user.
- Protected routing: authenticated dashboard access and unauthenticated redirect verified.
- Daily task CRUD: create, edit, complete, and confirmed delete all passed against the remote Supabase database.
- Navigation: every redesigned dashboard route rendered and was captured without page or console errors.
- Pomodoro: start and pause states passed.
- Mobile: drawer open/close surface and bottom navigation passed.
- Test users and their cascaded study rows were deleted after every run.

## Remaining P3 notes

- Live content can produce more task rows than the three-row source example.
- The complete legacy navigation is denser than the abbreviated concept sidebar by explicit user requirement.

## Automated evidence

- `npx playwright test --config=playwright.config.js`: 1 passed.
- Browser page errors: 0.
- Browser console errors: 0.
- HTTP responses >= 400 during the final run: 0.
- `npm run lint`: passed.
- `npm run build`: passed on Next.js 16.3.0.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Supabase migration history: all seven local and remote versions match.

final result: passed
