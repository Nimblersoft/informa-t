# Runbook: Demo cutover, smoke y rollback — MediaHack II

> Operación del prototipo informa-t durante la evaluación en vivo (2026-08-15).
> Objetivo: garantizar que la demo siempre tenga un camino recuperable.

# Spec: docs/specs/url-analysis.md, docs/specs/model-fallback.md

## 1. Topología desplegada

| Elemento | Valor |
|---|---|
| Dominio público principal | `https://informa-t.nimblersoft.com` (custom domain, cert Cloudflare) |
| Dominio de respaldo | `https://informa-t.ericmaster.workers.dev` |
| Worker | `informa-t` (cuenta Nimblersoft) |
| Bindings | `AI`, `AI_SEARCH`, `ASSETS` — sin D1/KV/R2/DO (sin persistencia) |
| Commit desplegado | `34fe05f` (claim-extraction.v3) |
| Versión actual | `11f0217b-77ac-4792-a024-7717fa7a9a2a` |
| Última versión buena previa | `4a0549c8-3995-4490-a562-d2209c731742` (misma lógica v3, sin dominio custom) |

## 2. Smoke pre-demo (ejecutar 10 min antes de la presentación)

Los dos recorridos críticos, ambos contra el dominio público:

```bash
# Flujo URL (artículo real de Ecuador Chequea)
curl -s -N -m 120 -X POST https://informa-t.nimblersoft.com/api/analyses \
  -H "Content-Type: application/json" \
  -d '{"url":"https://ecuadorchequea.com/chequeaprimero-la-entrevista-de-daniel-noboa-en-teleamazonas/"}'
# Esperado: ~18 eventos SSE; >=2 claim.extracted; >=6 evidence.retrieved; terminal completed|partial.

# Flujo texto (aseveración B1 del corpus)
curl -s -N -m 90 -X POST https://informa-t.nimblersoft.com/api/analyses \
  -H "Content-Type: application/json" \
  -d '{"text":"La pobreza por ingresos en junio de 2025 estuvo en su mejor punto desde 2018, alrededor de 24 puntos."}'
# Esperado: eventos SSE con aseveraciones y evidencia INEC; terminal completed|partial.
```

Criterio de salida OK: ambos flujos emiten `claim.extracted` con racional y alcanzan estado terminal explícito. Un terminal `partial` con degradaciones en español es COMPORTAMIENTO ESPECIFICADO (honestidad), no falla.

## 3. Escalera de contingencia (en orden)

1. **Dominio custom lento/DNS**: presentar en `https://informa-t.ericmaster.workers.dev` (mismo Worker, mismo código).
2. **Flujo URL falla (fetch del medio o extracción)**: usar el flujo de texto pegado (payload B1/A1 del §2 y del guion de demo).
3. **Proveedores de modelos degradados**: la UI muestra limitaciones en español por modelo; narrar como degradación honesta diseñada. El flujo continúa con los modelos disponibles.
4. **Modelos totalmente caídos**: demostrar el caso sintético A1 (fixture) — `GET https://informa-t.nimblersoft.com/api/demo/cases/a1` y el panel editorial del shell (accesible, decisión humana, exportación ClaimReview JSON-LD + traza de auditoría). Es el baseline fixture-only: no depende de ningún proveedor externo.
5. **Despliegue defectuoso**: rollback (§4).

## 4. Rollback

```bash
# Ver historial y capturar IDs de versión
npx wrangler deployments list

# Volver a la versión anterior buena
npx wrangler rollback
# o a una versión específica:
npx wrangler rollback 4a0549c8-3995-4490-a562-d2209c731742

# Redesplegar desde un commit bueno conocido
git checkout 34fe05f && npm run build && npx wrangler deploy
```

El rollback de Workers es inmediato y sin reconstrucción (mismo código ya subido). Verificar tras el rollback con el smoke del §2.

## 5. Notas operativas

- Sin persistencia: cada análisis es una solicitud SSE en memoria; no hay datos que corromper ni limpiar entre demos.
- `OPENROUTER_API_KEY` vive en secretos del Worker (Infisical como fuente); nunca en código ni en este runbook.
- La cuota de OpenRouter es de pago por uso; una demo consume ~2-4 invocaciones de extracción. Si se agota, la etapa cae al respaldo Workers AI automáticamente (con procedencia visible en la traza).
