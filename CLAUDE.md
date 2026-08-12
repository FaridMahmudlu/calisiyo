@AGENTS.md

## Dedicated Claude test account

Use the production test account identified by `claude.test@calisiyo.app` for end-to-end product checks. Its password is intentionally not stored in the repository; obtain it from the project owner and pass credentials to test commands through `CLAUDE_TEST_EMAIL` and `CLAUDE_TEST_PASSWORD` environment variables.

The account is a normal, non-admin Supabase user protected by the same RLS policies as every other student. It may freely create, update, and delete only its own study data across the dashboard. Do not use the service-role key in browser code or commit it to any file.

To reset the account to a realistic full-data state, run `scripts/seed-demo-account.mjs` server-side with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_FULL_NAME`, `DEMO_ACCOUNT_TYPE=claude_test`, and `DEMO_MANAGED_BY=claude`. The seed is idempotent and refreshes plans, sessions, Pomodoro history, subjects, mock exams, wrong questions, reviews, resources, notes, goals, and notifications.
