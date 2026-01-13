#!/usr/bin/env python3
"""
Pipeline orquestador para la preparación de datos UNHCR.

Este script ejecuta todo el pipeline de limpieza y transformación:
1. Valida que los archivos de entrada existen
2. Limpia y normaliza los datos
3. Genera los 4 CSVs de salida para SciGraphs
4. Valida los archivos de salida

Uso:
    python run_pipeline.py [--validate-only] [--verbose]

Opciones:
    --validate-only: Solo valida los datos sin generar salidas
    --verbose: Muestra información detallada
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime

# Añadir el directorio actual al path
sys.path.insert(0, str(Path(__file__).parent))

from country_mapping import normalize_country, COUNTRY_MAPPING, EXCLUDED_ENTRIES
from data_cleaner import (
    load_csv_safe,
    clean_asylum_seekers,
    clean_persons_of_concern,
    clean_time_series,
    clean_demographics,
    clean_resettlement,
    validate_geocodable
)
from transform_to_graph import (
    generate_q1_flujos_globales,
    generate_q2_evolucion_temporal,
    generate_q3_nodos_transito,
    generate_q4_genero_rutas,
    get_data_paths
)


def print_header(text: str):
    """Imprime un encabezado formateado."""
    print("\n" + "=" * 60)
    print(text)
    print("=" * 60)


def print_section(text: str):
    """Imprime una sección formateada."""
    print("\n" + "-" * 40)
    print(text)
    print("-" * 40)


def validate_input_files() -> bool:
    """
    Valida que todos los archivos de entrada existen.
    
    Returns:
        True si todos los archivos existen, False en caso contrario
    """
    print_section("Validando archivos de entrada")
    
    paths = get_data_paths()
    required_files = [
        'asylum_seekers',
        'asylum_monthly',
        'persons_of_concern',
        'demographics',
        'time_series',
        'resettlement'
    ]
    
    all_exist = True
    for name in required_files:
        filepath = paths[name]
        exists = filepath.exists()
        status = "✓" if exists else "✗"
        size = f"{filepath.stat().st_size / (1024*1024):.1f} MB" if exists else "N/A"
        print(f"  {status} {filepath.name}: {size}")
        if not exists:
            all_exist = False
    
    return all_exist


def validate_country_coverage(verbose: bool = False) -> dict:
    """
    Valida la cobertura del mapeo de países.
    
    Returns:
        Diccionario con estadísticas de cobertura
    """
    print_section("Validando cobertura de países")
    
    paths = get_data_paths()
    
    # Recopilar todos los países únicos
    all_countries = set()
    
    for name in ['asylum_seekers', 'persons_of_concern', 'time_series']:
        df = load_csv_safe(str(paths[name]))
        if 'Origin' in df.columns:
            all_countries.update(df['Origin'].dropna().unique())
        if 'Country / territory of asylum/residence' in df.columns:
            all_countries.update(df['Country / territory of asylum/residence'].dropna().unique())
    
    # Clasificar países
    mapped = set()
    excluded = set()
    geocodable = set()
    unknown = set()
    
    for country in all_countries:
        if country in COUNTRY_MAPPING:
            mapped.add(country)
        elif country in EXCLUDED_ENTRIES:
            excluded.add(country)
        elif normalize_country(country) is not None:
            geocodable.add(country)
        else:
            unknown.add(country)
    
    print(f"  Total países únicos: {len(all_countries)}")
    print(f"  ✓ Mapeados: {len(mapped)}")
    print(f"  ✓ Ya geocodificables: {len(geocodable)}")
    print(f"  ✓ Excluidos (intencionalmente): {len(excluded)}")
    print(f"  ⚠ Desconocidos: {len(unknown)}")
    
    if verbose and unknown:
        print("\n  Países desconocidos (pueden fallar geocodificación):")
        for c in sorted(unknown)[:20]:
            print(f"    - {c}")
    
    return {
        'total': len(all_countries),
        'mapped': len(mapped),
        'geocodable': len(geocodable),
        'excluded': len(excluded),
        'unknown': len(unknown),
        'unknown_list': list(unknown)
    }


def validate_output_files() -> bool:
    """
    Valida que los archivos de salida se generaron correctamente.
    
    Returns:
        True si todos los archivos son válidos, False en caso contrario
    """
    print_section("Validando archivos de salida")
    
    paths = get_data_paths()
    output_dir = paths['output_dir']
    
    expected_files = [
        'q1_flujos_globales.csv',
        'q2_evolucion_temporal.csv',
        'q3_nodos_transito.csv',
        'q4_genero_rutas.csv'
    ]
    
    all_valid = True
    for filename in expected_files:
        filepath = output_dir / filename
        
        if not filepath.exists():
            print(f"  ✗ {filename}: NO EXISTE")
            all_valid = False
            continue
        
        # Leer y validar
        try:
            df = load_csv_safe(str(filepath))
            rows = len(df)
            cols = len(df.columns)
            size = filepath.stat().st_size / 1024
            
            # Verificar columnas requeridas
            has_source = 'Source' in df.columns
            has_target = 'Target' in df.columns
            
            if has_source and has_target and rows > 0:
                print(f"  ✓ {filename}: {rows:,} filas, {cols} columnas, {size:.1f} KB")
            else:
                print(f"  ⚠ {filename}: Columnas faltantes o vacío")
                all_valid = False
                
        except Exception as e:
            print(f"  ✗ {filename}: Error al leer - {e}")
            all_valid = False
    
    return all_valid


def run_full_pipeline(verbose: bool = False):
    """
    Ejecuta el pipeline completo de transformación.
    """
    start_time = datetime.now()
    
    print_header("PIPELINE DE PREPARACIÓN DE DATOS UNHCR")
    print(f"Inicio: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Paso 1: Validar archivos de entrada
    if not validate_input_files():
        print("\n❌ ERROR: Faltan archivos de entrada")
        sys.exit(1)
    
    # Paso 2: Validar cobertura de países
    coverage = validate_country_coverage(verbose)
    if coverage['unknown'] > 10:
        print(f"\n⚠ ADVERTENCIA: {coverage['unknown']} países pueden fallar geocodificación")
    
    # Paso 3: Generar archivos de salida
    print_section("Generando archivos de salida")
    
    paths = get_data_paths()
    output_dir = paths['output_dir']
    output_dir.mkdir(exist_ok=True)
    
    try:
        generate_q1_flujos_globales(output_dir / 'q1_flujos_globales.csv')
        generate_q2_evolucion_temporal(output_dir / 'q2_evolucion_temporal.csv')
        generate_q3_nodos_transito(output_dir / 'q3_nodos_transito.csv')
        generate_q4_genero_rutas(output_dir / 'q4_genero_rutas.csv')
    except Exception as e:
        print(f"\n❌ ERROR durante la generación: {e}")
        sys.exit(1)
    
    # Paso 4: Validar archivos de salida
    if not validate_output_files():
        print("\n⚠ ADVERTENCIA: Algunos archivos de salida tienen problemas")
    
    # Resumen final
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print_header("PIPELINE COMPLETADO")
    print(f"Duración: {duration:.1f} segundos")
    print(f"Archivos generados en: {output_dir}")
    print("\nPróximos pasos:")
    print("  1. Abre Blender con SciGraphs instalado")
    print("  2. Carga uno de los archivos CSV generados")
    print("  3. Selecciona Source y Target como columnas")
    print("  4. Activa 'Geospatial Mode' para visualización en globo")
    print("  5. Haz clic en 'Create Graph'")


def run_validation_only(verbose: bool = False):
    """
    Solo ejecuta las validaciones sin generar archivos.
    """
    print_header("VALIDACIÓN DE DATOS UNHCR")
    
    # Validar entradas
    validate_input_files()
    
    # Validar países
    coverage = validate_country_coverage(verbose)
    
    # Validar salidas existentes
    validate_output_files()
    
    print_header("VALIDACIÓN COMPLETADA")


def main():
    """Función principal del pipeline."""
    parser = argparse.ArgumentParser(
        description='Pipeline de preparación de datos UNHCR para SciGraphs'
    )
    parser.add_argument(
        '--validate-only', 
        action='store_true',
        help='Solo validar datos sin generar archivos'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Mostrar información detallada'
    )
    
    args = parser.parse_args()
    
    if args.validate_only:
        run_validation_only(args.verbose)
    else:
        run_full_pipeline(args.verbose)


if __name__ == "__main__":
    main()

