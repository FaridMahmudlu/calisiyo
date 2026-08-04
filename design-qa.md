# Design QA

- Selected landing direction: `design-references/selected-landing-option-2-study-path.png`
- Implementation viewport: 1440 × 1024 CSS px, device scale factor 1
- Local implementation URL: `http://127.0.0.1:3100`
- Desktop implementation: `design-references/qa/landing-story-desktop.png`
- Mobile implementation: `design-references/qa/landing-story-mobile.png`
- Side-by-side visual review: `design-references/qa/final-landing-study-path-comparison.png`
- Authenticated dashboard evidence: `design-references/qa/gunluk-program-desktop.png`
- Responsive navigation evidence: `design-references/qa/gunluk-program-mobile.png` and `design-references/qa/mobile-navigation-open.png`
- Real demo data evidence: `design-references/qa/demo-dashboard-desktop.png`, `design-references/qa/demo-istatistikler-desktop.png`, and `design-references/qa/demo-istatistikler-mobile.png`

## Visual comparison

The selected direction and implementation were placed side by side and inspected as one image. The implementation keeps the selected concept’s emerald 3D study path, planner, focus timer, progress checkpoints, YKS summit, ivory canvas, dark-green typography, compact fixed navigation, and clear conversion actions. The page is intentionally longer than the concept so it can explain every preserved product capability without inventing testimonials, rankings, or success claims.

### Landing review

1. The hero matches the selected direction’s split composition, large left-aligned headline, green route, milestone controls, mountain destination, and 19 August 2027 target.
2. The generated 3D plan, focus, and progress scenes use one consistent light, material, camera angle, palette, and background.
3. Scroll-driven parallax and reveal motion support the story without blocking content; reduced-motion preferences are respected.
4. The fixed navigation, responsive CTA hierarchy, real countdown, chapter links, guide, capability inventory, privacy statement, and footer are functional.
5. Desktop and 390 px mobile captures have no horizontal overflow, clipped text, or placeholder assets.

### Dashboard review

1. All legacy routes remain in the panel. The panel has one close/open control and a keyboard-accessible 210–340 px resize handle.
2. The global top bar is visible on every dashboard route. Bell and profile controls open accessible, dismissible menus.
3. The notification center has unread state, mark-one, mark-all, action links, empty/loading states, realtime refresh, and preference-aware plan/repeat/Pomodoro events.
4. The streak card now shows today’s actual minutes against the 30-minute threshold and includes an explanatory info popover.
5. Native selects are absent; searchable custom listboxes use the same minimal design system.
6. Loading screens use the Plan → Odak → İlerleme journey animation in compact and full-page states.

## Functional verification

- Email registration, field selection, email/password login, server-backed logout, Google authorization redirect, and Apple removal passed.
- A deliberately profile-less authenticated account repaired its profile during `/api/account` loading and rendered the dashboard with no global error.
- Account loading now isolates task/session summary failures instead of blanking the entire shell.
- Notification seed, daily-plan reminder, due-repeat reminder, Pomodoro completion, task completion, exam creation, and 30-minute study triggers are installed with RLS and realtime publication.
- Notification preferences save to both `profiles.notifications_enabled` and `study_preferences`.
- Daily task create, edit, complete, and confirmed delete passed against Supabase.
- Settings, goals, Pomodoro start/pause, sidebar resize/collapse, mobile drawer, and all dashboard routes passed.
- The permanent `Mert Kaya` demo account rendered real tasks, sessions, exams, topics, resources, difficult questions, repeats, notes, goals, and statistics.
- YKS countdown uses the explicit estimated date `19 Ağustos 2027`.

## Automated evidence

- Local Playwright functional suite: 2 passed, 1 expected credential-gated skip.
- Dedicated permanent demo-account Playwright run: 1 passed.
- Browser page errors: 0.
- Browser console errors: 0.
- HTTP responses >= 400 during the final local run: 0.
- `npm run lint`: passed.
- `npm run build`: passed on Next.js 16.3.0.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Supabase schema lint: 0 errors.
- Supabase migrations applied: notifications and streak rules, RLS hardening, profile welcome notification.
- Supabase database advisors: previous trigger exposure and RLS performance warnings resolved. The remaining leaked-password warning requires Supabase Pro and is not available on the current free plan.

final result: passed
