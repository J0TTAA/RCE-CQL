# Especificacion frontend

## Estado

Este paquete define la maqueta de alta fidelidad del RCE y el contrato para su
futura implementacion en `apps/web`. No crea codigo frontend mientras el gate
M0 del proyecto principal permanezca abierto.

## Documentos

1. [REQUIREMENTS.md](./REQUIREMENTS.md): comportamiento y criterios visuales.
2. [DESIGN.md](./DESIGN.md): arquitectura de componentes, pantallas y estilos.
3. [TASKS.md](./TASKS.md): orden para generar, revisar e integrar la maqueta.
4. [V0_PROMPT.md](./V0_PROMPT.md): prompt maestro y prompts de iteracion para v0.

## Jerarquia

Este paquete deriva de los documentos principales:

- [Requisitos del sistema](../REQUIREMENTS.md).
- [Diseno del sistema](../DESIGN.md).
- [WBS del sistema](../TASKS.md).

Ante una contradiccion, prevalecen los documentos principales. El prototipo de
v0 es una referencia visual e interactiva; no define contratos backend ni
demuestra interoperabilidad CQL/FHIR.

## Uso recomendado

1. Crear un proyecto independiente en v0, sin conectarlo todavia al repositorio.
2. Pegar el prompt maestro completo.
3. Revisar la maqueta con los criterios `FE-AC-*`.
4. Aplicar los prompts de iteracion uno por uno.
5. Exportar el resultado o abrir una rama v0 solo despues de aprobar la maqueta.

La separacion evita que una generacion automatica modifique `main` o mezcle
codigo de prototipo con el backend ya verificado.
