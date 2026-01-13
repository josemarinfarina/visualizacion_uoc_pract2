"""
Script de limpieza general de datos UNHCR.

Este módulo proporciona funciones para:
- Normalizar nombres de países
- Manejar valores faltantes y marcadores especiales
- Filtrar registros no geocodificables
- Validar datos para uso con SciGraphs
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, List, Tuple
from country_mapping import normalize_country, is_geocodable, EXCLUDED_ENTRIES


def load_csv_safe(filepath: str) -> pd.DataFrame:
    """
    Carga un CSV de forma segura, manejando tipos mixtos.
    
    Args:
        filepath: Ruta al archivo CSV
        
    Returns:
        DataFrame con los datos cargados
    """
    return pd.read_csv(filepath, low_memory=False)


def normalize_country_names(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    """
    Normaliza los nombres de países en las columnas especificadas.
    
    Args:
        df: DataFrame con los datos
        columns: Lista de columnas que contienen nombres de países
        
    Returns:
        DataFrame con nombres de países normalizados
    """
    df = df.copy()
    
    for col in columns:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: normalize_country(x) if pd.notna(x) else None)
    
    return df


def handle_missing_values(df: pd.DataFrame, numeric_columns: Optional[List[str]] = None) -> pd.DataFrame:
    """
    Maneja valores faltantes y marcadores especiales.
    
    - Reemplaza '*' por NaN
    - Reemplaza valores vacíos por NaN
    - Opcionalmente convierte columnas numéricas y rellena con 0
    
    Args:
        df: DataFrame con los datos
        numeric_columns: Lista de columnas que deben ser numéricas (opcional)
        
    Returns:
        DataFrame con valores faltantes manejados
    """
    df = df.copy()
    
    # Reemplazar '*' por NaN en todo el DataFrame
    df = df.replace('*', np.nan)
    df = df.replace('', np.nan)
    
    # Si se especifican columnas numéricas, convertirlas y rellenar con 0
    if numeric_columns:
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    return df


def filter_unknown_origins(df: pd.DataFrame, 
                           origin_col: str = 'Origin',
                           destination_col: str = 'Country / territory of asylum/residence') -> pd.DataFrame:
    """
    Filtra registros con origen o destino desconocido/no geocodificable.
    
    Args:
        df: DataFrame con los datos
        origin_col: Nombre de la columna de origen
        destination_col: Nombre de la columna de destino
        
    Returns:
        DataFrame filtrado sin registros no geocodificables
    """
    df = df.copy()
    
    # Filtrar filas donde origen o destino es None (no geocodificable)
    if origin_col in df.columns:
        df = df[df[origin_col].notna()]
    
    if destination_col in df.columns:
        df = df[df[destination_col].notna()]
    
    return df


def filter_self_loops(df: pd.DataFrame,
                      source_col: str = 'Source',
                      target_col: str = 'Target') -> pd.DataFrame:
    """
    Elimina registros donde origen y destino son el mismo país.
    
    Args:
        df: DataFrame con los datos
        source_col: Nombre de la columna de origen
        target_col: Nombre de la columna de destino
        
    Returns:
        DataFrame sin self-loops
    """
    df = df.copy()
    
    if source_col in df.columns and target_col in df.columns:
        df = df[df[source_col] != df[target_col]]
    
    return df


def validate_geocodable(df: pd.DataFrame, 
                        columns: List[str]) -> Tuple[pd.DataFrame, List[str]]:
    """
    Valida que todos los países en las columnas especificadas son geocodificables.
    
    Args:
        df: DataFrame con los datos
        columns: Lista de columnas que contienen nombres de países
        
    Returns:
        Tupla de (DataFrame válido, lista de países no geocodificables)
    """
    non_geocodable = set()
    
    for col in columns:
        if col in df.columns:
            unique_values = df[col].dropna().unique()
            for val in unique_values:
                if not is_geocodable(val):
                    non_geocodable.add(val)
    
    return df, list(non_geocodable)


def get_year_range(df: pd.DataFrame, year_col: str = 'Year') -> Tuple[int, int]:
    """
    Obtiene el rango de años en el dataset.
    
    Args:
        df: DataFrame con los datos
        year_col: Nombre de la columna de año
        
    Returns:
        Tupla de (año mínimo, año máximo)
    """
    if year_col in df.columns:
        years = pd.to_numeric(df[year_col], errors='coerce').dropna()
        return int(years.min()), int(years.max())
    return None, None


def filter_year_range(df: pd.DataFrame, 
                      start_year: int, 
                      end_year: int,
                      year_col: str = 'Year') -> pd.DataFrame:
    """
    Filtra datos por rango de años.
    
    Args:
        df: DataFrame con los datos
        start_year: Año de inicio (inclusivo)
        end_year: Año de fin (inclusivo)
        year_col: Nombre de la columna de año
        
    Returns:
        DataFrame filtrado por años
    """
    df = df.copy()
    
    if year_col in df.columns:
        df[year_col] = pd.to_numeric(df[year_col], errors='coerce')
        df = df[(df[year_col] >= start_year) & (df[year_col] <= end_year)]
    
    return df


def aggregate_flows(df: pd.DataFrame,
                    source_col: str,
                    target_col: str,
                    value_cols: List[str],
                    group_by: Optional[List[str]] = None) -> pd.DataFrame:
    """
    Agrega flujos entre pares de países.
    
    Args:
        df: DataFrame con los datos
        source_col: Nombre de la columna de origen
        target_col: Nombre de la columna de destino
        value_cols: Lista de columnas de valores a sumar
        group_by: Columnas adicionales para agrupar (e.g., 'Year')
        
    Returns:
        DataFrame con flujos agregados
    """
    df = df.copy()
    
    # Definir columnas de agrupación
    group_cols = [source_col, target_col]
    if group_by:
        group_cols.extend(group_by)
    
    # Asegurar que las columnas de valores son numéricas
    for col in value_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Filtrar columnas de valores que existen
    existing_value_cols = [col for col in value_cols if col in df.columns]
    
    # Agregar
    agg_dict = {col: 'sum' for col in existing_value_cols}
    result = df.groupby(group_cols, as_index=False).agg(agg_dict)
    
    return result


def clean_asylum_seekers(filepath: str) -> pd.DataFrame:
    """
    Limpia el archivo asylum_seekers.csv.
    
    Args:
        filepath: Ruta al archivo
        
    Returns:
        DataFrame limpio
    """
    df = load_csv_safe(filepath)
    
    # Columnas de países
    country_cols = ['Country / territory of asylum/residence', 'Origin']
    
    # Columnas numéricas
    numeric_cols = [
        'Tota pending start-year', 'of which UNHCR-assisted(start-year)',
        'Applied during year', 'decisions_recognized', 'decisions_other',
        'Rejected', 'Otherwise closed', 'Total decisions',
        'Total pending end-year', 'of which UNHCR-assisted(end-year)'
    ]
    
    # Limpiar
    df = handle_missing_values(df, numeric_cols)
    df = normalize_country_names(df, country_cols)
    df = filter_unknown_origins(df, 'Origin', 'Country / territory of asylum/residence')
    
    return df


def clean_persons_of_concern(filepath: str) -> pd.DataFrame:
    """
    Limpia el archivo persons_of_concern.csv.
    
    Args:
        filepath: Ruta al archivo
        
    Returns:
        DataFrame limpio
    """
    df = load_csv_safe(filepath)
    
    # Columnas de países
    country_cols = ['Country / territory of asylum/residence', 'Origin']
    
    # Columnas numéricas
    numeric_cols = [
        'Refugees (incl. refugee-like situations)', 'Asylum-seekers (pending cases)',
        'Returned refugees', 'Internally displaced persons (IDPs)',
        'Returned IDPs', 'Stateless persons', 'Others of concern', 'Total Population'
    ]
    
    # Limpiar
    df = handle_missing_values(df, numeric_cols)
    df = normalize_country_names(df, country_cols)
    df = filter_unknown_origins(df, 'Origin', 'Country / territory of asylum/residence')
    
    return df


def clean_time_series(filepath: str) -> pd.DataFrame:
    """
    Limpia el archivo time_series.csv.
    
    Args:
        filepath: Ruta al archivo
        
    Returns:
        DataFrame limpio
    """
    df = load_csv_safe(filepath)
    
    # Columnas de países
    country_cols = ['Country / territory of asylum/residence', 'Origin']
    
    # Columnas numéricas
    numeric_cols = ['Value']
    
    # Limpiar
    df = handle_missing_values(df, numeric_cols)
    df = normalize_country_names(df, country_cols)
    df = filter_unknown_origins(df, 'Origin', 'Country / territory of asylum/residence')
    
    return df


def clean_demographics(filepath: str) -> pd.DataFrame:
    """
    Limpia el archivo demographics.csv.
    
    Args:
        filepath: Ruta al archivo
        
    Returns:
        DataFrame limpio
    """
    df = load_csv_safe(filepath)
    
    # Columna de país (demographics solo tiene país de asilo, no origen)
    country_cols = ['Country / territory of asylum/residence']
    
    # Columnas numéricas (todas las de género y edad)
    numeric_cols = [
        'Female 0-4', 'Female 5-11', 'Female 5-17', 'Female 12-17',
        'Female 18-59', 'Female 60+', 'F: Unknown', 'F: Total',
        'Male 0-4', 'Male 5-11', 'Male 5-17', 'Male 12-17',
        'Male 18-59', 'Male 60+', 'M: Unknown', 'M: Total'
    ]
    
    # Limpiar
    df = handle_missing_values(df, numeric_cols)
    df = normalize_country_names(df, country_cols)
    
    # Filtrar países no geocodificables
    df = df[df['Country / territory of asylum/residence'].notna()]
    
    return df


def clean_resettlement(filepath: str) -> pd.DataFrame:
    """
    Limpia el archivo resettlement.csv.
    
    Args:
        filepath: Ruta al archivo
        
    Returns:
        DataFrame limpio
    """
    df = load_csv_safe(filepath)
    
    # Columnas de países
    country_cols = ['Country / territory of asylum/residence', 'Origin']
    
    # Columnas numéricas
    numeric_cols = ['Value']
    
    # Limpiar
    df = handle_missing_values(df, numeric_cols)
    df = normalize_country_names(df, country_cols)
    df = filter_unknown_origins(df, 'Origin', 'Country / territory of asylum/residence')
    
    return df


def clean_asylum_monthly(filepath: str) -> pd.DataFrame:
    """
    Limpia el archivo asylum_seekers_monthly.csv.
    
    Args:
        filepath: Ruta al archivo
        
    Returns:
        DataFrame limpio
    """
    df = load_csv_safe(filepath)
    
    # Columnas de países
    country_cols = ['Country / territory of asylum/residence', 'Origin']
    
    # Columnas numéricas
    numeric_cols = ['Value']
    
    # Limpiar
    df = handle_missing_values(df, numeric_cols)
    df = normalize_country_names(df, country_cols)
    df = filter_unknown_origins(df, 'Origin', 'Country / territory of asylum/residence')
    
    return df


if __name__ == "__main__":
    # Test del módulo con un archivo de ejemplo
    import os
    
    data_dir = Path(__file__).parent.parent
    
    print("Testing data cleaning functions...")
    print("-" * 50)
    
    # Test con asylum_seekers.csv
    asylum_file = data_dir / "asylum_seekers.csv"
    if asylum_file.exists():
        df = clean_asylum_seekers(str(asylum_file))
        print(f"asylum_seekers.csv:")
        print(f"  Rows after cleaning: {len(df):,}")
        print(f"  Unique origins: {df['Origin'].nunique()}")
        print(f"  Unique destinations: {df['Country / territory of asylum/residence'].nunique()}")
        print(f"  Year range: {get_year_range(df)}")
        
        # Validar geocodificación
        _, non_geo = validate_geocodable(df, ['Origin', 'Country / territory of asylum/residence'])
        if non_geo:
            print(f"  ⚠ Non-geocodable countries: {non_geo}")
        else:
            print(f"  ✓ All countries are geocodable")
    
    print("-" * 50)
    print("Cleaning tests completed!")

