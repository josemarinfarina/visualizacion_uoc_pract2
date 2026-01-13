# Datos UNHCR para Visualización con SciGraphs

Este directorio contiene los datos del UNHCR (Alto Comisionado de las Naciones Unidas para los Refugiados) y los scripts de procesamiento para generar visualizaciones con SciGraphs en Blender.

## Estructura del Directorio

```
data/
├── scripts/                    # Scripts de procesamiento
│   ├── country_mapping.py      # Diccionario de normalización de países
│   ├── data_cleaner.py         # Funciones de limpieza de datos
│   ├── transform_to_graph.py   # Transformación a formato grafo
│   ├── run_pipeline.py         # Orquestador principal
│   └── requirements.txt        # Dependencias Python
├── output/                     # CSVs generados para SciGraphs
│   ├── q1_flujos_globales.csv
│   ├── q2_evolucion_temporal.csv
│   ├── q3_nodos_transito.csv
│   └── q4_genero_rutas.csv
└── [archivos originales .csv]  # Datos crudos del UNHCR
```

## Archivos de Salida

### q1_flujos_globales.csv
**Pregunta 1: ¿Cuáles son los principales sumideros y fuentes?**

| Columna | Descripción |
|---------|-------------|
| Source | País de origen (emigración) |
| Target | País de destino (inmigración) |
| TotalRefugees | Total de refugiados reconocidos (2000-2016) |
| TotalAsylum | Total de solicitudes de asilo |
| TotalRejected | Total de solicitudes rechazadas |
| TotalFlow | Flujo total (refugiados + asilo) |

**Uso en SciGraphs:**
- Source Column: `Source`
- Target Column: `Target`
- Geospatial Mode: ✓
- Análisis recomendado: In-degree/Out-degree, Flow Analysis

### q2_evolucion_temporal.csv
**Pregunta 2: ¿Cómo ha cambiado la topología de la red desde 2000 a 2016?**

| Columna | Descripción |
|---------|-------------|
| Source | País de origen |
| Target | País de destino |
| Year | Año (2000-2016) |
| Value | Número de refugiados ese año |

**Uso en SciGraphs:**
- Source Column: `Source`
- Target Column: `Target`
- Time Column: `Year`
- Geospatial Mode: ✓
- Usar filtrado temporal para comparar años

### q3_nodos_transito.csv
**Pregunta 3: ¿Qué países actúan como nodos de tránsito críticos?**

| Columna | Descripción |
|---------|-------------|
| Source | País de origen |
| Target | País de destino |
| Value | Total de solicitudes procesadas |
| Rejected | Solicitudes rechazadas |
| Recognized | Solicitudes aceptadas |
| RejectionRate | Tasa de rechazo (0-1) |

**Uso en SciGraphs:**
- Source Column: `Source`
- Target Column: `Target`
- Geospatial Mode: ✓
- Análisis recomendado: Betweenness Centrality, PageRank
- Los nodos con alto RejectionRate pueden ser países de tránsito

### q4_genero_rutas.csv
**Pregunta 4: ¿Existen rutas con desproporción de género?**

| Columna | Descripción |
|---------|-------------|
| Source | País de origen |
| Target | País de destino |
| Year | Año |
| TotalFlow | Flujo total de refugiados |
| TotalFemale | Total de mujeres |
| TotalMale | Total de hombres |
| TotalChildren | Total de menores (0-17 años) |
| FemaleRatio | Proporción de mujeres (0-1) |
| ChildrenRatio | Proporción de menores (0-1) |

**Uso en SciGraphs:**
- Source Column: `Source`
- Target Column: `Target`
- Colorear aristas por `FemaleRatio` o `ChildrenRatio`

## Uso Rápido

### 1. Regenerar los datos de salida

```bash
cd data/scripts
python3 run_pipeline.py
```

### 2. Solo validar datos

```bash
python3 run_pipeline.py --validate-only
```

### 3. Visualizar en SciGraphs (Blender)

1. Abre Blender con SciGraphs instalado
2. Ve al panel SciGraphs (3D View → Sidebar → SciGraphs)
3. Carga uno de los archivos CSV de `output/`
4. Configura las columnas Source y Target
5. Activa "Geospatial Mode" para visualización en globo
6. Haz clic en "Create Graph"

## Notas Técnicas

### Normalización de Países
Los nombres de países del UNHCR se normalizan automáticamente para compatibilidad con geocodificación:
- "Syrian Arab Rep." → "Syria"
- "Iran (Islamic Rep. of)" → "Iran"
- "Various/Unknown" → Excluido (no geocodificable)

### Filtrado de Datos
- Se excluyen flujos muy pequeños (< 100 personas) para evitar ruido visual
- Se eliminan self-loops (mismo país origen y destino)
- Rango temporal: 2000-2016 (años con datos más completos)

### Formato SciGraphs
Los CSVs siguen el formato esperado por SciGraphs:
- Columnas `Source` y `Target` para definir aristas del grafo
- Columna `Year` opcional para filtrado temporal
- Columnas numéricas adicionales como atributos de arista

