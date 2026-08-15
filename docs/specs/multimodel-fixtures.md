# Spec: Fixtures multimodelo capturados

## Propósito

Los cinco casos capturados (`A1`, `A2`, `A3`, `B1` y `C1`) son artefactos estáticos de preparación para demostrar propuestas de análisis no vinculantes. No son una ruta de producto, no ejecutan herramientas de línea de comandos en tiempo de ejecución y no determinan una decisión editorial.

## Contrato de fixture

Cada JSON en `src/fixtures/cases/` se ajusta a `src/fixtures/schema.json`. Conserva la fecha, herramienta, modelo, identificador versionado del prompt, descomposición, tres propuestas y una traza estructurada. Cada salida de propuesta lleva el SHA-256 de su JSON canónico UTF-8; el hash agregado corresponde al arreglo de las tres salidas en orden.

La traza registra únicamente procedencia estructurada: herramienta, modelo, identificador de prompt, etapa, fecha, estado y hash de salida. No persiste prompts completos, credenciales, datos privados ni razonamiento interno.

## Límites de gobernanza

- Los prompts solicitan propuestas estructuradas y límites de evidencia, no una categoría o decisión editorial.
- Los resultados publicados por terceros no forman parte de los prompts ni de los fixtures.
- La validación rechaza secretos, OAuth, identificadores de credenciales, contenido de razonamiento interno, datos de contacto y referencias al resultado externo prohibido.
- La preparación se realiza fuera del repositorio mediante CLIs autorizados; el código de aplicación no invoca dichas CLIs.

## Validación

`npm run fixtures:validate` comprueba el contrato, la cobertura de los cinco casos, los tres modelos por caso, hashes SHA-256 canónicos, trazas y los límites de seguridad y anti-oráculo.
