# M4 Evidence - Patient Save Validation Fix

## Scope

- Fixed a patient drawer save failure caused by synthetic pediatric BMI values
  being rejected by the API validation range.
- Added frontend error recovery so a failed save returns the drawer to an
  editable state and displays the backend error instead of staying on
  "Guardando".

## Commands

| Command | Exit code | Notes |
| ------- | --------- | ----- |
| `npm run format --workspace @rce-cql/api` | 0 | API formatting passed. |
| `npm exec prettier -- --write apps/web/src/features/patients/PatientChartPage.tsx` | 0 | Web file formatting passed. |
| `npm run typecheck --workspace @rce-cql/api` | 0 | API TypeScript passed. |
| `npm run typecheck --workspace @rce-cql/web` | 0 | Web TypeScript passed. |
| `npm run lint --workspace @rce-cql/api` | 0 | ESLint passed with `--max-warnings=0`. |
| `npm run test --workspace @rce-cql/api` | 0 | 20 tests passed, 0 failed. |
| `npm run build --workspace @rce-cql/web` | 0 | Vite production build passed. |
| `npm run build --workspace @rce-cql/api` | 0 | API production TypeScript build passed. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | SDD validation passed: 102 requirements, 102 references, 98 tasks, 0 errors. |

## Notes

- Vite still reports the local Node.js `21.7.1` warning; Docker builds use
  Node.js `24.18.0`.
