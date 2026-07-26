# Registro de riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigacion/Gate | Estado |
|---|---|---|---|---|---|
| RISK-001 | El ELM del traductor no es compatible con Clinical Reasoning de HAPI. | Media | Alto | COMP-005 y TASK-0.7 antes de implementar features. | OPEN |
| RISK-002 | `$apply` no ejecuta el tipo de artefacto o estado editorial esperado. | Media | Alto | TASK-0.7 y TASK-0.8; conservar `RuleExecutorPort`. | OPEN |
| RISK-003 | FHIRHelpers/includes no se resuelven de forma consistente. | Alta | Alto | Fixture versionado, multipart y preflight en TASK-0.4/0.5. | OPEN |
| RISK-004 | El starter HAPI se expone sin seguridad. | Media | Alto | Solo red local de Compose; navegador accede por Nest en el producto. | OPEN |
| RISK-005 | Se introducen datos identificables durante clases. | Baja | Critico | Fixtures sinteticos, tags de procedencia y revision de logs. | OPEN |
| RISK-006 | Los diagnosticos del traductor no entregan locators utilizables por Monaco. | Media | Medio | Activar locators/detailed-errors y verificar respuesta en TASK-0.5. | OPEN |
| RISK-007 | La maquina no dispone de Docker y bloquea M0. | Alta | Alto | Instalar/habilitar Docker Desktop o runtime Compose compatible. | ACTIVE |
| RISK-008 | Requisitos, diseno y tareas se desalinean. | Media | Medio | `scripts/validate-sdd.ps1` y trazabilidad actualizada por cambio. | MITIGATED |
| RISK-009 | Una simulacion UI se interpreta como interoperabilidad real. | Media | Alto | Prohibir mocks como evidencia de gates de integracion. | MITIGATED |
