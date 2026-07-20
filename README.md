# Observatorio de Sostenibilidad Ambiental · Marbella

Panel web de indicadores ambientales del municipio de Marbella para el marco de la **Agenda Urbana 2030**, a partir de datos de **teledetección (Dinapsis / Hidralia)** integrados por el DTI del Ayuntamiento de Marbella.

🔗 **Live:** https://josehino.github.io/observatorio-ambiental-marbella/

## Contenido
- **Panorama del municipio:** KPIs con variación interanual (cobertura vegetal, superficie verde por habitante, suelo sellado, temperatura superficial, isla de calor, absorción de CO₂).
- **Explorador de 16 indicadores** agrupados en 4 categorías (Verde urbano · Depuración de aire · Clima urbano · Territorio), con comparación Municipio + 4 Distritos.
- **Costa · Línea de playa:** evolución de la posición de la orilla en 27 playas (avance/retroceso, m).

Periodo: **enero 2021 – abril 2026** · 5.536 registros mensuales.

## Técnico
- HTML único + `data.js`, gráficas en **SVG propio** (sin librerías externas) → funciona offline y en GitHub Pages.
- Datos embebidos (la fuente es un Excel interno sin API pública).

## Fuente
Indicadores ambientales de teledetección (Dinapsis / Hidralia) · Agenda Urbana 2030 · Ayuntamiento de Marbella (DTI).
Los indicadores de depuración de aire (NO₂, PM₂,₅, SO₂, CO₂) reflejan la cantidad **eliminada/absorbida por la vegetación**, no la emisión.
