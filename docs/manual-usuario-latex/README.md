# Manual de uso RCE CQL

Este directorio contiene el proyecto LaTeX del manual de uso para docente y
alumnos.

## Archivos

- `manual-rce-cql.tex`: documento principal.
- `figures/`: capturas de pantalla usadas por el manual.

## Compilar en Overleaf

1. Subir el archivo ZIP del manual a Overleaf.
2. Definir `manual-rce-cql.tex` como archivo principal si Overleaf no lo detecta.
3. Compilar con pdfLaTeX.

## Compilar localmente

Desde este directorio:

```bash
pdflatex manual-rce-cql.tex
pdflatex manual-rce-cql.tex
```

Se ejecuta dos veces para actualizar correctamente el indice y las referencias
de figuras.

## Nota

Las capturas muestran pacientes sinteticos. No corresponden a datos clinicos
reales.
