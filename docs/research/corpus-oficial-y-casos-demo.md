---
titulo: "Investigacion: corpus oficial y casos reales para el demo de MediaHack II"
tipo: investigacion
estado: activo
confianza: alta
fuentes:
  - "https://openlab.ec/mediahack2026/kit"
  - "https://ecuadorchequea.com/metodologia-ecuador-chequea/"
  - "Fuentes institucionales enlazadas en cada seccion"
etiquetas:
  - mediahack
  - fuentes-oficiales
  - fact-checking
  - demo
ultima_revision: 2026-08-15
---

# Corpus oficial y casos reales para el demo

## Proposito y limite

Esta investigacion selecciona fuentes y casos para un prototipo demostrable. El [kit de MediaHack II](https://openlab.ec/mediahack2026/kit) es el punto de partida del registro de fuentes. Una herramienta de IA, una noticia relacionada o una declaracion institucional aislada no constituye evidencia suficiente por si misma.

El corpus sera curado: no se intentara copiar o mantener completos los portales institucionales durante el hackaton. Cada artefacto incorporado debe conservar institucion, titulo, URL original, fecha o version, fecha de recuperacion y, cuando corresponda, pagina y hash del archivo descargado.

## Registro inicial de fuentes

| Fuente | Colecciones prioritarias | Acceso observado | Corte recomendado para el MVP | Riesgos y controles |
|---|---|---|---|---|
| [Consejo Nacional Electoral](https://www.cne.gob.ec/estadisticas/bases-de-datos/) | Bases por proceso electoral, resultados, actas y planes de trabajo de candidaturas | Catalogo web y descargas; no se encontro una API publica general documentada | Elecciones Generales 2025: planes de trabajo y un subconjunto de resultados o actas | El sitio carga parte del catalogo dinamicamente. Registrar proceso, vuelta y caracter preliminar o definitivo del dato. |
| [INEC — Banco de Datos Abiertos](https://aplicaciones3.ecuadorencifras.gob.ec/BIINEC-war/) | Pobreza, empleo, censos, proyecciones y otros indicadores oficiales | Bases, metodologias, sintaxis y tabulados en formatos abiertos | Series y boletines de pobreza por ingresos usados por los casos de demostracion | La licencia indicada es [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). No equiparar microdatos anonimizados con datos individuales. |
| [Datos Abiertos Ecuador](https://www.datosabiertos.gob.ec/dataset) | Catalogo transversal de datasets estatales | Busqueda, metadatos y descargas en formatos que dependen de cada dataset | Entre dos y cinco recursos con licencia explicita y utilidad directa para los casos | La licencia no es uniforme. Conservar publicador, fecha de actualizacion y licencia de cada recurso. |
| [SERCOP — Contrataciones Abiertas](https://datosabiertos.compraspublicas.gob.ec/PLATAFORMA) | Procesos, entidades, proveedores, montos y bienes o servicios bajo OCDS | Consulta publica, exportaciones estructuradas y servicios documentados por SERCOP | Una entidad, un periodo y un conjunto pequeno de procesos | El portal puede ser lento. Conservar identificador del proceso, etapa y fecha de descarga. No confundir consulta publica con operaciones autenticadas de SOCE. |
| [Registro Oficial](https://www.registroficial.gob.ec/) | Leyes, decretos, reglamentos, acuerdos y resoluciones publicados | Busqueda y descarga de ejemplares PDF; no se encontro una API publica general | Entre cinco y veinte normas directamente vinculadas con los casos | Los PDF pueden requerir OCR. La cita debe incluir tipo de edicion, numero, fecha, pagina o articulo y hash. La publicacion prueba el texto oficial, no sus efectos materiales. |
| [Asamblea Nacional](https://www.asambleanacional.gob.ec/es/multimedios-legislativos/list?periodo=All&tid_1=All&title=) | Proyectos de ley, leyes y estado del tramite legislativo | Busqueda HTML y documentos enlazados; sin API publica general documentada | Entre diez y treinta registros relevantes, con sus documentos primarios | Algunas rutas responden con controles de acceso. Verificar manualmente titulo, proponente, fecha, comision y estado. |

### Fuentes institucionales complementarias

Los casos seleccionados requieren ademas datos del [Ministerio del Interior](https://cifras.ministeriodelinterior.gob.ec/), [Servicio de Rentas Internas](https://www.sri.gob.ec/), [Banco Central del Ecuador](https://www.bce.fin.ec/estadisticas-economicas/) y [Superintendencia de Bancos](https://www.superbancos.gob.ec/estadisticas/portalestudios/balances-generales/). Estas fuentes pueden incorporarse al registro solo mediante una decision curatorial explicita y con la misma metadata de procedencia. El kit sigue siendo la semilla del registro, no una lista cerrada que convierta automaticamente cualquier pagina institucional en evidencia suficiente.

## Taxonomia editorial de referencia

La metodologia publicada por Ecuador Chequea el 18 de noviembre de 2025 define seis categorias: **Cierto, Falso, Impreciso, Enganoso, Satira e Inverificable**. Una pagina metodologica anterior conserva una septima categoria, **Alterado**, para contenido multimedia modificado. El MVP adopta las seis categorias de la metodologia mas reciente; la posible alteracion de medios se muestra como senal separada y nunca como hallazgo forense concluyente.

La seleccion pertenece exclusivamente a la persona editora. Las salidas de modelos son propuestas de analisis y no pueden completar, publicar ni exportar una categoria sin una accion humana explicita.

## Tres enlaces y cinco afirmaciones de prueba

Los veredictos publicados funcionan como resultado esperado para evaluar el prototipo. No se entregan a los modelos durante la ejecucion del caso.

### Caso A — Entrevista en Teleamazonas

- **Articulo:** [La entrevista de Daniel Noboa en Teleamazonas](https://ecuadorchequea.com/chequeaprimero-la-entrevista-de-daniel-noboa-en-teleamazonas/), 31 de octubre de 2025.
- **Afirmacion A1:** "Hemos bajado la pobreza al mejor punto desde 2018, con 24 puntos".
  - Resultado publicado: **Impreciso**.
  - Evidencia principal: [INEC — pobreza por ingresos](https://www.ecuadorencifras.gob.ec/pobreza-por-ingresos-resultados-2025/).
  - Escenario que prueba: distinguir pobreza de pobreza extrema y conservar fecha, indicador y unidad.
- **Afirmacion A2:** "En 2025, nueve de cada diez muertes violentas corresponden a personas con antecedentes penales".
  - Resultado publicado: **Inverificable**.
  - Evidencia principal: [Ministerio del Interior — homicidios intencionales](https://cifras.ministeriodelinterior.gob.ec/#/app/estadisticas-seguridad-homicidios).
  - Escenario que prueba: reconocer que la fuente disponible no contiene el atributo necesario, sin convertir ausencia de datos en falsedad.
- **Afirmacion A3:** "Las ventas en septiembre subieron 14% y en octubre 8,4%, pese al paro".
  - Resultado publicado: **Impreciso**.
  - Evidencia principal: [SRI — informacion institucional](https://www.sri.gob.ec/detalle-noticias?idnoticia=1220&marquesina=1).
  - Escenario que prueba: una cifra cercana pero distinta y otra cifra que aun no estaba publicada al corte del chequeo.

### Caso B — Entrevista en Radio City

- **Articulo:** [Daniel Noboa hablo en Radio City de Guayaquil](https://ecuadorchequea.com/daniel-noboa-hablo-en-radio-city-de-guayaquil-ecuador-chequea-verifico-cinco-de-sus-afirmaciones/), 20 de febrero de 2026.
- **Afirmacion B1:** "La pobreza en diciembre de 2017 era 21,5%; ahora estamos en 21,4%".
  - Resultado publicado: **Cierto**.
  - Evidencia principal: [INEC — series de pobreza por ingresos](https://www.ecuadorencifras.gob.ec/pobreza-por-ingresos/).
  - Escenario que prueba: confirmar la cifra sin exagerar su importancia; la variacion fue marginal y no estadisticamente significativa segun la fuente citada.

### Caso C — Entrevista en Radio Sucre

- **Articulo:** [Daniel Noboa en Radio Sucre, verificado](https://ecuadorchequea.com/daniel-noboa-en-radio-sucre-verificado/), 9 de marzo de 2026.
- **Afirmacion C1:** "El Banco del Pacifico fue el mas rentable en 2024 con USD 173 millones de utilidad".
  - Resultado publicado: **Enganoso**.
  - Evidencia principal: [Superintendencia de Bancos — balances generales](https://www.superbancos.gob.ec/estadisticas/portalestudios/balances-generales/).
  - Escenario que prueba: separar una parte correcta —lidero en utilidades— de una cuantia incorrecta —USD 158,06 millones segun la verificacion publicada—.

## Uso en la demostracion

1. Ejecutar al menos un caso conocido de extremo a extremo sin revelar al modelo su resultado publicado.
2. Mostrar la afirmacion atomica, los extractos oficiales recuperados y la cobertura conocida del corpus.
3. Mostrar como contexto, en una seccion separada, noticias relacionadas obtenidas mediante busqueda web y sus enlaces.
4. Mostrar la propuesta estructurada de cada modelo y cualquier desacuerdo; no mostrar ni almacenar cadenas internas de pensamiento.
5. Exigir que una persona editora seleccione y justifique el veredicto antes de habilitar la exportacion `ClaimReview`.
6. Comparar el veredicto humano del demo con el resultado publicado por Ecuador Chequea solo como evaluacion posterior.

## Evidencia de la investigacion

La seleccion fue contrastada el 15 de agosto de 2026 mediante busqueda web en vivo de Codex, busqueda web y lector web de Z.ai, y lectura directa de los portales enlazados. Los portales dinamicos de Datos Abiertos Ecuador, SERCOP, Registro Oficial y Asamblea presentaron respuestas incompletas o intermitentes en algunas consultas; por ello, la ingesta debe tratar cada URL como candidata hasta verificar y registrar el artefacto concreto.
