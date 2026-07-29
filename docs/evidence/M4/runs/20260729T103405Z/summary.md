# M4 Evidence - Guided Clinical Resource Editing

## Scope

- Reviewed and completed the interrupted implementation for guided patient editing.
- Added controlled CRUD rows for sandbox clinical resources from the patient drawer.
- Extended the effective sandbox bundle with generated FHIR R4 resources for:
  `Condition`, `Observation`, `MedicationRequest`, `AllergyIntolerance`,
  `Encounter`, `Procedure`, `Immunization` and `ServiceRequest`.
- Updated the PatientChart tabs and API contract so edited resources are visible
  and can affect CQL/CDS evaluation without editing raw JSON.

## Commands

| Command | Exit code | Notes |
| ------- | --------- | ----- |
| `npm run format --workspace @rce-cql/api` | 0 | Prettier applied to API files. |
| `npm exec prettier -- --write apps/web/src/features/patients/PatientChartPage.tsx apps/web/src/styles/globals.css apps/web/src/types.ts apps/web/src/lib/rce-api.ts docs/DESIGN.md docs/TASKS.md` | 0 | Formatted web and docs touched by this change. |
| `npm run lint --workspace @rce-cql/api` | 0 | ESLint passed with `--max-warnings=0`. |
| `npm run format:check --workspace @rce-cql/api` | 0 | API format check passed. |
| `npm run typecheck --workspace @rce-cql/api` | 0 | API TypeScript passed. |
| `npm run typecheck --workspace @rce-cql/web` | 0 | Web TypeScript passed. |
| `npm run test --workspace @rce-cql/api` | 0 | 20 tests passed, 0 failed. |
| `npm run build --workspace @rce-cql/api` | 0 | API production TypeScript build passed. |
| `npm run build --workspace @rce-cql/web` | 0 | Vite production build passed. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | SDD validation passed: 102 requirements, 102 references, 98 tasks, 0 errors. |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | No whitespace errors. |

## Notes

- Vite emitted an environment warning because this machine reports Node.js
  `21.7.1`; Vite recommends `20.19+` or `22.12+`. The web build still completed.
- Verification was local static/build verification; no live browser screenshot was
  captured in this run.
