"""
Diccionario de mapeo de nombres de países UNHCR a nombres estándar
reconocibles por GeoPy/GeoPandas para geocodificación.

Este módulo contiene:
- COUNTRY_MAPPING: Diccionario de normalización de nombres
- EXCLUDED_ENTRIES: Valores que no son países geocodificables
- normalize_country(): Función para aplicar la normalización
"""

# Nombres que no son países geocodificables y deben ser excluidos
EXCLUDED_ENTRIES = {
    "Various/Unknown",
    "Various/unknown",
    "Stateless",
    "Tibetan",
    "Palestinian",  # Se maneja como "Palestine" si se quiere incluir
}

# Mapeo de nombres UNHCR a nombres estándar para geocodificación
COUNTRY_MAPPING = {
    # Repúblicas y nombres oficiales largos
    "Syrian Arab Rep.": "Syria",
    "Iran (Islamic Rep. of)": "Iran",
    "Dem. Rep. of the Congo": "Democratic Republic of the Congo",
    "Central African Rep.": "Central African Republic",
    "Lao People's Dem. Rep.": "Laos",
    "Dem. People's Rep. of Korea": "North Korea",
    "Rep. of Korea": "South Korea",
    "Rep. of Moldova": "Moldova",
    "Dominican Rep.": "Dominican Republic",
    "United Rep. of Tanzania": "Tanzania",
    "Czech Rep.": "Czech Republic",
    "Bolivia (Plurinational State of)": "Bolivia",
    "Venezuela (Bolivarian Republic of)": "Venezuela",
    "Micronesia (Federated States of)": "Micronesia",
    
    # Serbia y Kosovo (variantes)
    "Serbia and Kosovo (S/RES/1244 (1999))": "Serbia",
    "Serbia and Kosovo: S/RES/1244 (1999)": "Serbia",
    
    # Macedonia (variantes históricas)
    "The former Yugoslav Rep. of Macedonia": "North Macedonia",
    "The former Yugoslav Republic of Macedonia": "North Macedonia",
    
    # Vietnam
    "Viet Nam": "Vietnam",
    
    # China - Regiones Administrativas Especiales
    "China, Hong Kong SAR": "Hong Kong",
    "China, Macao SAR": "Macau",
    
    # Reino Unido (variantes)
    "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
    
    # Estados Unidos (variantes de agencias)
    "USA (EOIR)": "United States",
    "USA (INS/DHS)": "United States",
    "United States of America": "United States",
    
    # Côte d'Ivoire (nombre francés)
    "Côte d'Ivoire": "Ivory Coast",
    
    # Swaziland (ahora Eswatini)
    "Swaziland": "Eswatini",
    
    # Cabo Verde
    "Cabo Verde": "Cape Verde",
    
    # Congo (República del Congo, no confundir con DRC)
    "Congo": "Republic of the Congo",
    
    # Palestina
    "State of Palestine": "Palestine",
    "Palestinian": "Palestine",  # Opcional: incluir si se quiere geocodificar
    
    # Holy See
    "Holy See (the)": "Vatican City",
    
    # Territorios y dependencias que pueden necesitar ajuste
    "Wallis and Futuna Islands ": "Wallis and Futuna",  # Nota: espacio extra al final
    "Svalbard and Jan Mayen": "Svalbard",
    "Saint-Pierre-et-Miquelon": "Saint Pierre and Miquelon",
    "Sint Maarten (Dutch part)": "Sint Maarten",
    
    # Nombres con caracteres especiales o variantes menores
    "Brunei Darussalam": "Brunei",
    "Timor-Leste": "East Timor",
    "Gambia": "The Gambia",
}

# Lista de países que ya están en formato correcto (no necesitan mapeo)
# Esto es útil para validación
VALID_COUNTRIES = {
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", 
    "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
    "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Bulgaria", "Burkina Faso",
    "Burundi", "Cambodia", "Cameroon", "Canada", "Chad",
    "Chile", "China", "Colombia", "Comoros", "Costa Rica",
    "Croatia", "Cuba", "Cyprus", "Denmark", "Djibouti",
    "Dominica", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
    "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland",
    "France", "Gabon", "Georgia", "Germany", "Ghana",
    "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
    "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
    "India", "Indonesia", "Iraq", "Ireland", "Israel",
    "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
    "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Latvia",
    "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
    "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
    "Maldives", "Mali", "Malta", "Mauritania", "Mauritius",
    "Mexico", "Monaco", "Mongolia", "Montenegro", "Morocco",
    "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
    "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
    "Norway", "Oman", "Pakistan", "Palau", "Panama",
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Qatar", "Romania", "Rwanda", "Samoa",
    "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Seychelles",
    "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
    "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka",
    "Sudan", "Suriname", "Sweden", "Switzerland", "Tajikistan",
    "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
    "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
    "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu",
    "Yemen", "Zambia", "Zimbabwe",
    # Territorios comunes
    "Aruba", "Bermuda", "Gibraltar", "Guadeloupe", "Martinique",
    "French Guiana", "French Polynesia", "New Caledonia", "Puerto Rico",
    "American Samoa", "Anguilla", "Cayman Islands", "Cook Islands",
    "Marshall Islands", "Montserrat", "Niue", "Norfolk Island",
    "Turks and Caicos Islands", "British Virgin Islands", "Bonaire",
    "Curaçao", "Western Sahara",
}


def normalize_country(name: str) -> str:
    """
    Normaliza el nombre de un país para geocodificación.
    
    Args:
        name: Nombre del país como aparece en los datos UNHCR
        
    Returns:
        Nombre normalizado para geocodificación, o None si no es geocodificable
    """
    if name is None or str(name).strip() == '':
        return None
    
    name = str(name).strip()
    
    # Verificar si está en la lista de excluidos
    if name in EXCLUDED_ENTRIES:
        return None
    
    # Aplicar mapeo si existe
    if name in COUNTRY_MAPPING:
        return COUNTRY_MAPPING[name]
    
    # Si ya está en formato válido, devolverlo tal cual
    if name in VALID_COUNTRIES:
        return name
    
    # Para países no mapeados, devolver el original (puede fallar geocodificación)
    return name


def get_all_countries_needing_mapping():
    """
    Devuelve la lista de todos los países que tienen mapeo definido.
    Útil para debugging y validación.
    """
    return list(COUNTRY_MAPPING.keys())


def is_geocodable(name: str) -> bool:
    """
    Verifica si un nombre de país puede ser geocodificado.
    
    Args:
        name: Nombre del país
        
    Returns:
        True si el país puede ser geocodificado, False en caso contrario
    """
    normalized = normalize_country(name)
    return normalized is not None


if __name__ == "__main__":
    # Test del módulo
    test_cases = [
        "Syrian Arab Rep.",
        "Serbia and Kosovo (S/RES/1244 (1999))",
        "Various/Unknown",
        "Germany",
        "Viet Nam",
        "USA (EOIR)",
        "Stateless",
    ]
    
    print("Testing country normalization:")
    print("-" * 50)
    for country in test_cases:
        normalized = normalize_country(country)
        geocodable = "✓" if is_geocodable(country) else "✗"
        print(f"{geocodable} '{country}' -> '{normalized}'")

