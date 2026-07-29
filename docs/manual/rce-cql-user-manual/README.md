# Manual de uso RCE CQL

Este paquete esta pensado para subirlo directo a Overleaf, TeXstudio u otro
editor LaTeX. No es un documento estilo tesis: es un manual operativo para que
un docente pueda levantar el RCE, mostrarlo en clase y compartir instrucciones
con alumnos.

## Como usarlo

1. Toma las capturas indicadas en `SCREENSHOTS.md`.
2. Guarda las imagenes PNG dentro de `figures/` usando exactamente los nombres
   sugeridos.
3. Sube esta carpeta completa, o el ZIP generado desde el repositorio, a tu
   editor LaTeX.
4. Compila `main.tex`.

El documento compila aunque falten imagenes. Cuando una captura no existe,
LaTeX mostrara una caja pendiente con el nombre del archivo esperado.

## Estructura

- `main.tex`: entrada principal del manual.
- `sections/`: capitulos breves del manual.
- `figures/`: carpeta donde van las capturas.
- `SCREENSHOTS.md`: checklist de imagenes y donde tomarlas.

## Recomendaciones para capturas

- Usar navegador en zoom 100%.
- Resolucion sugerida: 1440x900 o 1366x768.
- Capturar solo datos sinteticos.
- Mantener visible la URL cuando ayude a explicar la ruta.
- Cerrar paneles de desarrollador salvo en capturas de consola/API.
