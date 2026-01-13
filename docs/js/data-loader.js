/**
 * Data Loader Module
 * Loads and processes UNHCR migration data
 */

const COUNTRY_REGIONS = {
    'Afghanistan': 'asia', 'Albania': 'europe', 'Algeria': 'africa', 'Angola': 'africa',
    'Argentina': 'americas', 'Armenia': 'asia', 'Australia': 'oceania', 'Austria': 'europe',
    'Azerbaijan': 'asia', 'Bangladesh': 'asia', 'Belarus': 'europe', 'Belgium': 'europe',
    'Benin': 'africa', 'Bolivia': 'americas', 'Bosnia and Herzegovina': 'europe',
    'Botswana': 'africa', 'Brazil': 'americas', 'Bulgaria': 'europe', 'Burkina Faso': 'africa',
    'Burundi': 'africa', 'Cambodia': 'asia', 'Cameroon': 'africa', 'Canada': 'americas',
    'Central African Republic': 'africa', 'Chad': 'africa', 'Chile': 'americas',
    'China': 'asia', 'Colombia': 'americas', 'Democratic Republic of the Congo': 'africa',
    'Republic of the Congo': 'africa', 'Costa Rica': 'americas', 'Croatia': 'europe',
    'Cuba': 'americas', 'Cyprus': 'europe', 'Czech Republic': 'europe', 'Denmark': 'europe',
    'Djibouti': 'africa', 'Dominican Republic': 'americas', 'Ecuador': 'americas',
    'Egypt': 'africa', 'El Salvador': 'americas', 'Eritrea': 'africa', 'Estonia': 'europe',
    'Ethiopia': 'africa', 'Finland': 'europe', 'France': 'europe', 'Gabon': 'africa',
    'Gambia': 'africa', 'Georgia': 'asia', 'Germany': 'europe', 'Ghana': 'africa',
    'Greece': 'europe', 'Guatemala': 'americas', 'Guinea': 'africa', 'Guinea-Bissau': 'africa',
    'Haiti': 'americas', 'Honduras': 'americas', 'Hungary': 'europe', 'India': 'asia',
    'Indonesia': 'asia', 'Iran': 'asia', 'Iraq': 'asia', 'Ireland': 'europe',
    'Israel': 'asia', 'Italy': 'europe', 'Ivory Coast': 'africa', 'Jamaica': 'americas',
    'Japan': 'asia', 'Jordan': 'asia', 'Kazakhstan': 'asia', 'Kenya': 'africa',
    'Kuwait': 'asia', 'Kyrgyzstan': 'asia', 'Laos': 'asia', 'Latvia': 'europe',
    'Lebanon': 'asia', 'Lesotho': 'africa', 'Liberia': 'africa', 'Libya': 'africa',
    'Lithuania': 'europe', 'Luxembourg': 'europe', 'Madagascar': 'africa', 'Malawi': 'africa',
    'Malaysia': 'asia', 'Mali': 'africa', 'Malta': 'europe', 'Mauritania': 'africa',
    'Mexico': 'americas', 'Moldova': 'europe', 'Mongolia': 'asia', 'Montenegro': 'europe',
    'Morocco': 'africa', 'Mozambique': 'africa', 'Myanmar': 'asia', 'Namibia': 'africa',
    'Nepal': 'asia', 'Netherlands': 'europe', 'New Zealand': 'oceania', 'Nicaragua': 'americas',
    'Niger': 'africa', 'Nigeria': 'africa', 'North Korea': 'asia', 'North Macedonia': 'europe',
    'Norway': 'europe', 'Pakistan': 'asia', 'Palestine': 'asia', 'Panama': 'americas',
    'Papua New Guinea': 'oceania', 'Paraguay': 'americas', 'Peru': 'americas',
    'Philippines': 'asia', 'Poland': 'europe', 'Portugal': 'europe', 'Qatar': 'asia',
    'Romania': 'europe', 'Russia': 'europe', 'Rwanda': 'africa', 'Saudi Arabia': 'asia',
    'Senegal': 'africa', 'Serbia': 'europe', 'Sierra Leone': 'africa', 'Singapore': 'asia',
    'Slovakia': 'europe', 'Slovenia': 'europe', 'Somalia': 'africa', 'South Africa': 'africa',
    'South Korea': 'asia', 'South Sudan': 'africa', 'Spain': 'europe', 'Sri Lanka': 'asia',
    'Sudan': 'africa', 'Sweden': 'europe', 'Switzerland': 'europe', 'Syria': 'asia',
    'Taiwan': 'asia', 'Tajikistan': 'asia', 'Tanzania': 'africa', 'Thailand': 'asia',
    'Togo': 'africa', 'Trinidad and Tobago': 'americas', 'Tunisia': 'africa', 'Turkey': 'asia',
    'Turkmenistan': 'asia', 'Uganda': 'africa', 'Ukraine': 'europe', 'United Arab Emirates': 'asia',
    'United Kingdom': 'europe', 'United States': 'americas', 'Uruguay': 'americas',
    'Uzbekistan': 'asia', 'Venezuela': 'americas', 'Vietnam': 'asia', 'Yemen': 'asia',
    'Zambia': 'africa', 'Zimbabwe': 'africa'
};

class DataLoader {
    constructor() {
        this.data = {
            flows: [],
            temporal: [],
            transit: [],
            gender: []
        };
        this.loaded = false;
    }
    
    async loadAll() {
        try {
            const basePath = 'data/';
            
            console.log('Loading data from:', basePath);
            
            const [flows, temporal, transit, gender] = await Promise.all([
                d3.csv(basePath + 'q1_flujos_globales.csv'),
                d3.csv(basePath + 'q2_evolucion_temporal.csv'),
                d3.csv(basePath + 'q3_nodos_transito.csv'),
                d3.csv(basePath + 'q4_genero_rutas.csv')
            ]);
            
            console.log('Raw data loaded:', {
                flows: flows?.length || 0,
                temporal: temporal?.length || 0,
                transit: transit?.length || 0,
                gender: gender?.length || 0
            });
            
            this.data.flows = this.processFlows(flows);
            this.data.temporal = this.processTemporal(temporal);
            this.data.transit = this.processTransit(transit);
            this.data.gender = this.processGender(gender);
            
            this.loaded = true;
            console.log('Data processed successfully');
            
            return this.data;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }
    
    processFlows(raw) {
        return raw.map(d => ({
            source: d.Source,
            target: d.Target,
            refugees: +d.TotalRefugees || 0,
            asylum: +d.TotalAsylum || 0,
            rejected: +d.TotalRejected || 0,
            totalFlow: +d.TotalFlow || 0,
            sourceRegion: COUNTRY_REGIONS[d.Source] || 'unknown',
            targetRegion: COUNTRY_REGIONS[d.Target] || 'unknown'
        })).filter(d => d.sourceRegion !== 'unknown' && d.targetRegion !== 'unknown');
    }
    
    processTemporal(raw) {
        return raw.map(d => ({
            source: d.Source,
            target: d.Target,
            year: +d.Year,
            value: +d.Value || 0,
            sourceRegion: COUNTRY_REGIONS[d.Source] || 'unknown',
            targetRegion: COUNTRY_REGIONS[d.Target] || 'unknown'
        })).filter(d => d.value > 0);
    }
    
    processTransit(raw) {
        return raw.map(d => ({
            source: d.Source,
            target: d.Target,
            applications: +d.Value || 0,
            rejected: +d.Rejected || 0,
            recognized: +d.Recognized || 0,
            rejectionRate: +d.RejectionRate || 0,
            sourceRegion: COUNTRY_REGIONS[d.Source] || 'unknown',
            targetRegion: COUNTRY_REGIONS[d.Target] || 'unknown'
        })).filter(d => d.applications > 0);
    }
    
    processGender(raw) {
        return raw.map(d => ({
            source: d.Source,
            target: d.Target,
            year: +d.Year,
            totalFlow: +d.TotalFlow || 0,
            female: +d.TotalFemale || 0,
            male: +d.TotalMale || 0,
            children: +d.TotalChildren || 0,
            femaleRatio: +d.FemaleRatio || 0,
            childrenRatio: +d.ChildrenRatio || 0,
            sourceRegion: COUNTRY_REGIONS[d.Source] || 'unknown',
            targetRegion: COUNTRY_REGIONS[d.Target] || 'unknown'
        })).filter(d => d.totalFlow > 0);
    }
}

const dataLoader = new DataLoader();
