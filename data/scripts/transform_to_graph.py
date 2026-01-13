"""
Script de transformación de datos UNHCR a formato de grafo para SciGraphs.

Este módulo genera los 4 CSVs de salida para las preguntas de investigación:
- q1_flujos_globales.csv: Agregación total de flujos (fuentes y sumideros)
- q2_evolucion_temporal.csv: Series temporales 2000-2016
- q3_nodos_transito.csv: Red para análisis de centralidad
- q4_genero_rutas.csv: Flujos con proporción de género
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional
from data_cleaner import (
    clean_asylum_seekers,
    clean_persons_of_concern,
    clean_time_series,
    clean_demographics,
    clean_resettlement,
    filter_year_range,
    aggregate_flows,
    filter_self_loops
)


def get_data_paths():
    """Obtiene las rutas a los archivos de datos."""
    data_dir = Path(__file__).parent.parent
    return {
        'asylum_seekers': data_dir / 'asylum_seekers.csv',
        'asylum_monthly': data_dir / 'asylum_seekers_monthly.csv',
        'persons_of_concern': data_dir / 'persons_of_concern.csv',
        'demographics': data_dir / 'demographics.csv',
        'time_series': data_dir / 'time_series.csv',
        'resettlement': data_dir / 'resettlement.csv',
        'output_dir': data_dir / 'output'
    }


def generate_q1_flujos_globales(output_path: Path) -> pd.DataFrame:
    """
    Genera CSV para Pregunta 1: Fuentes y Sumideros.
    
    Agrega flujos totales (2000-2016) para identificar:
    - Países emisores (fuentes): alto out-degree
    - Países receptores (sumideros): alto in-degree
    
    Returns:
        DataFrame con columnas: Source, Target, TotalRefugees, TotalAsylum, TotalRejected
    """
    print("Generando Q1: Flujos Globales...")
    
    paths = get_data_paths()
    
    # Cargar y limpiar datos principales
    df_poc = clean_persons_of_concern(str(paths['persons_of_concern']))
    df_asylum = clean_asylum_seekers(str(paths['asylum_seekers']))
    
    # Filtrar años 2000-2016
    df_poc = filter_year_range(df_poc, 2000, 2016)
    df_asylum = filter_year_range(df_asylum, 2000, 2016)
    
    # Renombrar columnas para formato estándar
    df_poc = df_poc.rename(columns={
        'Country / territory of asylum/residence': 'Target',
        'Origin': 'Source'
    })
    
    df_asylum = df_asylum.rename(columns={
        'Country / territory of asylum/residence': 'Target',
        'Origin': 'Source'
    })
    
    # Agregar flujos de refugiados
    refugees = aggregate_flows(
        df_poc,
        'Source', 'Target',
        ['Refugees (incl. refugee-like situations)', 'Asylum-seekers (pending cases)']
    )
    refugees = refugees.rename(columns={
        'Refugees (incl. refugee-like situations)': 'TotalRefugees',
        'Asylum-seekers (pending cases)': 'TotalAsylum'
    })
    
    # Agregar rechazos
    rejected = aggregate_flows(
        df_asylum,
        'Source', 'Target',
        ['Rejected']
    )
    rejected = rejected.rename(columns={'Rejected': 'TotalRejected'})
    
    # Combinar
    result = refugees.merge(rejected, on=['Source', 'Target'], how='outer')
    result = result.fillna(0)
    
    # Calcular valor total para ordenar
    result['TotalFlow'] = result['TotalRefugees'] + result['TotalAsylum']
    
    # Filtrar flujos muy pequeños (menos de 100 personas en total)
    result = result[result['TotalFlow'] >= 100]
    
    # Eliminar self-loops
    result = filter_self_loops(result)
    
    # Ordenar por flujo total
    result = result.sort_values('TotalFlow', ascending=False)
    
    # Guardar
    result.to_csv(output_path, index=False)
    
    print(f"  ✓ Guardado: {output_path}")
    print(f"    Aristas: {len(result):,}")
    print(f"    Nodos únicos: {len(set(result['Source']) | set(result['Target']))}")
    print(f"    Top 5 rutas por flujo:")
    for _, row in result.head().iterrows():
        print(f"      {row['Source']} -> {row['Target']}: {row['TotalFlow']:,.0f}")
    
    return result


def generate_q2_evolucion_temporal(output_path: Path) -> pd.DataFrame:
    """
    Genera CSV para Pregunta 2: Evolución Temporal (2000-2016).
    
    Series temporales anuales para analizar:
    - Cambios en la topología de la red
    - Densificación vs polarización
    
    Returns:
        DataFrame con columnas: Source, Target, Year, Value
    """
    print("\nGenerando Q2: Evolución Temporal...")
    
    paths = get_data_paths()
    
    # Usar time_series.csv que tiene mejor granularidad temporal
    df = clean_time_series(str(paths['time_series']))
    
    # Filtrar solo refugiados (no otros tipos)
    df = df[df['Population type'] == 'Refugees (incl. refugee-like situations)']
    
    # Filtrar años 2000-2016
    df = filter_year_range(df, 2000, 2016)
    
    # Renombrar columnas
    df = df.rename(columns={
        'Country / territory of asylum/residence': 'Target',
        'Origin': 'Source'
    })
    
    # Agregar por año
    result = aggregate_flows(
        df,
        'Source', 'Target',
        ['Value'],
        group_by=['Year']
    )
    
    # Filtrar flujos muy pequeños (menos de 50 personas por año)
    result = result[result['Value'] >= 50]
    
    # Eliminar self-loops
    result = filter_self_loops(result)
    
    # Ordenar por año y valor
    result = result.sort_values(['Year', 'Value'], ascending=[True, False])
    
    # Convertir Year a entero
    result['Year'] = result['Year'].astype(int)
    
    # Guardar
    result.to_csv(output_path, index=False)
    
    print(f"  ✓ Guardado: {output_path}")
    print(f"    Filas totales: {len(result):,}")
    print(f"    Rango de años: {result['Year'].min()} - {result['Year'].max()}")
    
    # Estadísticas por año
    stats_by_year = result.groupby('Year').agg({
        'Value': ['count', 'sum']
    })
    stats_by_year.columns = ['Edges', 'TotalFlow']
    print(f"    Aristas por año (muestra):")
    for year in [2000, 2005, 2010, 2015, 2016]:
        if year in stats_by_year.index:
            print(f"      {year}: {stats_by_year.loc[year, 'Edges']:,} aristas, {stats_by_year.loc[year, 'TotalFlow']:,.0f} personas")
    
    return result


def generate_q3_nodos_transito(output_path: Path) -> pd.DataFrame:
    """
    Genera CSV para Pregunta 3: Nodos de Tránsito.
    
    Red optimizada para análisis de centralidad:
    - Betweenness centrality: países intermediarios
    - PageRank: importancia en la red
    
    Incluye rechazos para capturar países de tránsito
    que reciben muchas solicitudes pero rechazan la mayoría.
    
    Returns:
        DataFrame con columnas: Source, Target, Value, Rejected
    """
    print("\nGenerando Q3: Nodos de Tránsito...")
    
    paths = get_data_paths()
    
    # Usar asylum_seekers.csv que tiene datos de rechazos
    df = clean_asylum_seekers(str(paths['asylum_seekers']))
    
    # Filtrar años 2000-2016
    df = filter_year_range(df, 2000, 2016)
    
    # Renombrar columnas
    df = df.rename(columns={
        'Country / territory of asylum/residence': 'Target',
        'Origin': 'Source'
    })
    
    # Agregar flujos totales
    result = aggregate_flows(
        df,
        'Source', 'Target',
        ['Applied during year', 'Rejected', 'decisions_recognized']
    )
    
    result = result.rename(columns={
        'Applied during year': 'Value',
        'decisions_recognized': 'Recognized'
    })
    
    # Calcular tasa de rechazo
    result['RejectionRate'] = result['Rejected'] / (result['Value'].replace(0, 1))
    result['RejectionRate'] = result['RejectionRate'].clip(0, 1)
    
    # Filtrar flujos significativos (al menos 100 solicitudes)
    result = result[result['Value'] >= 100]
    
    # Eliminar self-loops
    result = filter_self_loops(result)
    
    # Ordenar por volumen
    result = result.sort_values('Value', ascending=False)
    
    # Guardar
    result.to_csv(output_path, index=False)
    
    print(f"  ✓ Guardado: {output_path}")
    print(f"    Aristas: {len(result):,}")
    print(f"    Nodos únicos: {len(set(result['Source']) | set(result['Target']))}")
    
    # Identificar potenciales países de tránsito
    # (alto volumen + alto rechazo)
    transit_candidates = result[
        (result['Value'] >= 10000) & 
        (result['RejectionRate'] >= 0.5)
    ]
    if len(transit_candidates) > 0:
        print(f"    Potenciales nodos de tránsito (alto volumen + alto rechazo):")
        for _, row in transit_candidates.head(5).iterrows():
            print(f"      {row['Source']} -> {row['Target']}: {row['Value']:,.0f} solicitudes, {row['RejectionRate']*100:.1f}% rechazadas")
    
    return result


def generate_q4_genero_rutas(output_path: Path) -> pd.DataFrame:
    """
    Genera CSV para Pregunta 4: Análisis de Género.
    
    Flujos con proporción de género y menores:
    - Rutas con mayor proporción de mujeres
    - Rutas con mayor proporción de niños
    
    Nota: demographics.csv solo tiene país de asilo, no origen.
    Por lo tanto, este análisis es a nivel de país receptor.
    
    Returns:
        DataFrame con columnas: Source, Target, Year, TotalFemale, TotalMale, FemaleRatio, ChildrenRatio
    """
    print("\nGenerando Q4: Análisis de Género...")
    
    paths = get_data_paths()
    
    # Cargar demographics y persons_of_concern
    df_demo = clean_demographics(str(paths['demographics']))
    df_poc = clean_persons_of_concern(str(paths['persons_of_concern']))
    
    # Filtrar años 2000-2016
    df_demo = filter_year_range(df_demo, 2001, 2016)  # Demographics empieza en 2001
    df_poc = filter_year_range(df_poc, 2001, 2016)
    
    # Para demographics, calcular totales de género
    # Columnas de mujeres: Female 0-4, Female 5-11, Female 5-17, Female 12-17, Female 18-59, Female 60+, F: Total
    # Columnas de hombres: Male 0-4, Male 5-11, Male 5-17, Male 12-17, Male 18-59, Male 60+, M: Total
    
    # Usar F: Total y M: Total si están disponibles
    df_demo['TotalFemale'] = pd.to_numeric(df_demo['F: Total'], errors='coerce').fillna(0)
    df_demo['TotalMale'] = pd.to_numeric(df_demo['M: Total'], errors='coerce').fillna(0)
    
    # Calcular niños (0-17)
    female_children_cols = ['Female 0-4', 'Female 5-11', 'Female 5-17', 'Female 12-17']
    male_children_cols = ['Male 0-4', 'Male 5-11', 'Male 5-17', 'Male 12-17']
    
    # Sumar niños (evitando doble conteo - usar 0-4 + 5-17 que no se solapan)
    df_demo['FemaleChildren'] = (
        pd.to_numeric(df_demo['Female 0-4'], errors='coerce').fillna(0) +
        pd.to_numeric(df_demo['Female 5-17'], errors='coerce').fillna(0)
    )
    df_demo['MaleChildren'] = (
        pd.to_numeric(df_demo['Male 0-4'], errors='coerce').fillna(0) +
        pd.to_numeric(df_demo['Male 5-17'], errors='coerce').fillna(0)
    )
    df_demo['TotalChildren'] = df_demo['FemaleChildren'] + df_demo['MaleChildren']
    
    # Agregar por país y año
    demo_agg = df_demo.groupby(['Country / territory of asylum/residence', 'Year']).agg({
        'TotalFemale': 'sum',
        'TotalMale': 'sum',
        'TotalChildren': 'sum'
    }).reset_index()
    
    demo_agg = demo_agg.rename(columns={'Country / territory of asylum/residence': 'Target'})
    
    # Ahora necesitamos los flujos origen-destino de persons_of_concern
    df_poc = df_poc.rename(columns={
        'Country / territory of asylum/residence': 'Target',
        'Origin': 'Source'
    })
    
    # Agregar flujos por origen-destino-año
    flows = aggregate_flows(
        df_poc,
        'Source', 'Target',
        ['Refugees (incl. refugee-like situations)'],
        group_by=['Year']
    )
    flows = flows.rename(columns={'Refugees (incl. refugee-like situations)': 'TotalFlow'})
    flows['Year'] = flows['Year'].astype(int)
    
    # Combinar con demographics por Target y Year
    # Distribuir proporciones de género según el flujo
    result = flows.merge(demo_agg, on=['Target', 'Year'], how='left')
    
    # Calcular ratios
    result['Total'] = result['TotalFemale'] + result['TotalMale']
    result['FemaleRatio'] = result['TotalFemale'] / result['Total'].replace(0, 1)
    result['ChildrenRatio'] = result['TotalChildren'] / result['Total'].replace(0, 1)
    
    # Filtrar filas sin datos de género
    result = result[result['Total'] > 0]
    
    # Filtrar flujos significativos
    result = result[result['TotalFlow'] >= 100]
    
    # Eliminar self-loops
    result = filter_self_loops(result)
    
    # Seleccionar columnas finales
    result = result[[
        'Source', 'Target', 'Year', 'TotalFlow',
        'TotalFemale', 'TotalMale', 'TotalChildren',
        'FemaleRatio', 'ChildrenRatio'
    ]]
    
    # Ordenar por ratio de mujeres/niños
    result = result.sort_values('FemaleRatio', ascending=False)
    
    # Guardar
    result.to_csv(output_path, index=False)
    
    print(f"  ✓ Guardado: {output_path}")
    print(f"    Filas totales: {len(result):,}")
    print(f"    Rango de años: {result['Year'].min()} - {result['Year'].max()}")
    
    # Rutas con mayor proporción de mujeres
    high_female = result[result['FemaleRatio'] >= 0.55].head(5)
    if len(high_female) > 0:
        print(f"    Rutas con >55% mujeres:")
        for _, row in high_female.iterrows():
            print(f"      {row['Source']} -> {row['Target']} ({row['Year']}): {row['FemaleRatio']*100:.1f}% mujeres")
    
    # Rutas con mayor proporción de niños
    high_children = result.nlargest(5, 'ChildrenRatio')
    if len(high_children) > 0:
        print(f"    Rutas con mayor proporción de niños:")
        for _, row in high_children.iterrows():
            print(f"      {row['Source']} -> {row['Target']} ({row['Year']}): {row['ChildrenRatio']*100:.1f}% menores")
    
    return result


def main():
    """Ejecuta la generación de todos los CSVs de salida."""
    print("=" * 60)
    print("TRANSFORMACIÓN DE DATOS UNHCR A FORMATO GRAFO")
    print("=" * 60)
    
    paths = get_data_paths()
    output_dir = paths['output_dir']
    output_dir.mkdir(exist_ok=True)
    
    # Generar cada CSV
    generate_q1_flujos_globales(output_dir / 'q1_flujos_globales.csv')
    generate_q2_evolucion_temporal(output_dir / 'q2_evolucion_temporal.csv')
    generate_q3_nodos_transito(output_dir / 'q3_nodos_transito.csv')
    generate_q4_genero_rutas(output_dir / 'q4_genero_rutas.csv')
    
    print("\n" + "=" * 60)
    print("TRANSFORMACIÓN COMPLETADA")
    print("=" * 60)
    print(f"\nArchivos generados en: {output_dir}")
    for f in output_dir.glob('*.csv'):
        size = f.stat().st_size / 1024
        print(f"  - {f.name}: {size:.1f} KB")


if __name__ == "__main__":
    main()

