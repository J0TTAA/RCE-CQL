# M4 Evidence - Patient Form Guardrails

## Scope

- Added client-side validation before saving patient overlays.
- Normalized numeric input so decimal comma and decimal point are both accepted.
- Added visible validation errors for date, numeric ranges and generated clinical resources.
- Expanded backend DTO ranges for educational/synthetic data so HAPI/Synthea edge
  values do not fail before the frontend can explain the issue.
- Disabled patient save while the drawer contains invalid values.

## Commands

| Command | Exit code | Notes |
| ------- | --------- | ----- |
| `npm run format --workspace @rce-cql/api` | 0 | API formatting passed. |
| `npm exec prettier -- --write apps/web/src/features/patients/PatientChartPage.tsx` | 0 | Patient chart formatting passed. |
| `npm exec prettier -- --write apps/web/src/styles/globals.css apps/web/src/features/patients/PatientChartPage.tsx` | 0 | Web formatting passed. |
| `npm run typecheck --workspace @rce-cql/api` | 0 | API TypeScript passed. |
| `npm run typecheck --workspace @rce-cql/web` | 0 | Web TypeScript passed. |
| `npm run lint --workspace @rce-cql/api` | 0 | ESLint passed with `--max-warnings=0`. |
| `npm run test --workspace @rce-cql/api` | 0 | 20 tests passed, 0 failed. |
| `npm run build --workspace @rce-cql/api` | 0 | API production TypeScript build passed. |
| `npm run build --workspace @rce-cql/web` | 0 | Vite production build passed. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | SDD validation passed: 102 requirements, 102 references, 98 tasks, 0 errors. |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | No whitespace errors. |

## Notes

- Vite still reports the local Node.js `21.7.1` warning; Docker builds use
  Node.js `24.18.0`.
