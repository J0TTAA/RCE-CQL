# Evidence M5 - Automatic Rule Versions And Pedagogic CDS Trace

Date: 2026-07-29

Scope:

- Backend-owned rule versioning for CQL Library resources.
- Pedagogic CDS Hooks trace focused on HL7 FHIR data, CQL evaluation and CDS cards.
- SDD updates for requirements, design, tasks and frontend guidance.

Commands executed:

| Command | Exit code | Notes |
| ------- | --------- | ----- |
| `npm run format --workspace @rce-cql/api` | 0 | Prettier formatted API files. |
| `npx prettier --write apps/web/src/features/cds/ActivityPage.tsx apps/web/src/features/cds/CdsExecutionTrace.tsx apps/web/src/features/rules/RuleWorkspacePage.tsx apps/web/src/features/rules/RulesPage.tsx apps/web/src/styles/globals.css docs/REQUIREMENTS.md docs/DESIGN.md docs/TASKS.md docs/frontend/REQUIREMENTS.md docs/frontend/DESIGN.md docs/frontend/TASKS.md docs/frontend/V0_PROMPT.md` | 0 | Prettier formatted touched web and SDD files. |
| `npm run lint --workspace @rce-cql/api` | 0 | ESLint passed with max warnings 0. |
| `npm run typecheck --workspace @rce-cql/api` | 1 | Initial run found strict index access in rule version helper. Fixed before final run. |
| `npm run typecheck --workspace @rce-cql/web` | 0 | TypeScript web typecheck passed. |
| `npm run test --workspace @rce-cql/api` | 0 | 20 tests passed. |
| `npm run typecheck --workspace @rce-cql/api` | 0 | Final API typecheck passed after helper fix. |
| `npm run build --workspace @rce-cql/api` | 0 | API build passed. |
| `npm run build --workspace @rce-cql/web` | 0 | Web build passed. Vite still warns that local Node is 21.7.1 and recommends 20.19+ or 22.12+. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | Final SDD validation passed: 103 requirements, 103 references, 99 tasks, 42 markdown files, 0 errors. |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | Whitespace check passed; Git reported LF-to-CRLF working-copy warnings for web files only. |

Result:

- Rule version input is no longer exposed as editable metadata in the RCE UI.
- Nest assigns draft version `0.1.0`, creates a new sandbox draft when editing a published rule, and rewrites the CQL library declaration before validation/publication.
- Publishing a first draft promotes it to `1.0.0`; edited published rules keep the next prepared patch version.
- CDS activity no longer presents response milliseconds or correlation IDs as main UI content.
- `CdsExecutionTrace` now explains the class flow as CDS Hooks moment, patient, sandbox, HL7 FHIR data, CQL rules and CDS card result.
