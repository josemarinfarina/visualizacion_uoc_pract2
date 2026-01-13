/**
 * Streamgraph Visualization
 * Temporal evolution of migration flows
 */

class StreamVisualization {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = null;
        this.type = 'silhouette';
        this.width = 0;
        this.height = 0;
        this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
        this.svg = null;
        this.tooltip = null;
        this.topCountries = [];
        
        this.colorScale = d3.scaleOrdinal()
            .range([
                '#dc2626', '#2563eb', '#ef4444', '#3b82f6', '#b91c1c',
                '#1d4ed8', '#f87171', '#60a5fa', '#991b1b', '#1e40af',
                '#fca5a5', '#93c5fd', '#7f1d1d', '#1e3a8a', '#fee2e2'
            ]);
        
        this.pivotedData = [];
        this.xScale = null;
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        
        if (this.width <= 0 || this.height <= 0) return;
        
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
        
        this.createTooltip();
    }
    
    createTooltip() {
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute');
    }
    
    setData(temporal) {
        this.data = temporal;
        this.processData();
        this.draw();
    }
    
    setType(type) {
        this.type = type;
        this.draw();
    }
    
    processData() {
        const countryTotals = {};
        
        this.data.forEach(d => {
            if (!countryTotals[d.source]) {
                countryTotals[d.source] = 0;
            }
            countryTotals[d.source] += d.value;
        });
        
        this.topCountries = Object.entries(countryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(d => d[0]);
        
        this.colorScale.domain(this.topCountries);
        this.createLegend();
    }
    
    createLegend() {
        const legend = document.getElementById('stream-legend');
        if (!legend) return;
        
        legend.innerHTML = this.topCountries.map(country => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${this.colorScale(country)}"></div>
                <span>${country}</span>
            </div>
        `).join('');
    }
    
    draw() {
        if (!this.data || !this.svg) return;
        
        this.svg.selectAll('*').remove();
        
        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
        
        const years = [...new Set(this.data.map(d => d.year))].sort();
        
        this.pivotedData = years.map(year => {
            const row = { year };
            this.topCountries.forEach(country => {
                const match = this.data.find(d => d.year === year && d.source === country);
                row[country] = match ? match.value : 0;
            });
            return row;
        });
        
        const pivoted = this.pivotedData;
        
        const offsetType = {
            'silhouette': d3.stackOffsetSilhouette,
            'expand': d3.stackOffsetExpand,
            'zero': d3.stackOffsetNone
        }[this.type] || d3.stackOffsetSilhouette;
        
        const stack = d3.stack()
            .keys(this.topCountries)
            .offset(offsetType)
            .order(d3.stackOrderInsideOut);
        
        const series = stack(pivoted);
        
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(years))
            .range([0, innerWidth]);
        
        const x = this.xScale;
        
        const yMin = d3.min(series, s => d3.min(s, d => d[0]));
        const yMax = d3.max(series, s => d3.max(s, d => d[1]));
        
        const y = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([innerHeight, 0]);
        
        const area = d3.area()
            .x(d => x(d.data.year))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveBasis);
        
        const paths = g.selectAll('path')
            .data(series)
            .join('path')
            .attr('fill', d => this.colorScale(d.key))
            .attr('stroke', '#1a1a24')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.85)
            .on('mouseover', (event, d) => {
                this.highlightCountry(d.key);
            })
            .on('mousemove', (event, d) => {
                const rect = this.container.getBoundingClientRect();
                const mouseX = event.clientX - rect.left - this.margin.left;
                const year = Math.round(this.xScale.invert(mouseX));
                const yearData = this.pivotedData.find(p => p.year === year);
                const value = yearData ? yearData[d.key] : 0;
                this.showTooltipWithData(event, d.key, year, value);
            })
            .on('mouseout', () => {
                this.resetHighlight();
                this.hideTooltip();
            });
        
        paths.transition()
            .duration(1500)
            .ease(d3.easeCubicOut)
            .attrTween('d', function(d) {
                const zeroArea = d3.area()
                    .x(dd => x(dd.data.year))
                    .y0(y(0))
                    .y1(y(0))
                    .curve(d3.curveBasis);
                
                const interpolate = d3.interpolateString(zeroArea(d), area(d));
                return t => interpolate(t);
            });
        
        const xAxis = d3.axisBottom(x)
            .ticks(years.length)
            .tickFormat(d3.format('d'));
        
        g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(xAxis)
            .attr('color', '#8888a0')
            .selectAll('text')
            .attr('fill', '#8888a0');
        
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#8888a0')
            .attr('font-size', '12px')
            .text('Año');
        
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e8e8ed')
            .attr('font-size', '14px')
            .attr('font-weight', '600')
            .text('Flujos Migratorios por País de Origen (2000-2016)');
    }
    
    highlightCountry(country) {
        this.svg.selectAll('path')
            .transition()
            .duration(200)
            .attr('opacity', d => d.key === country ? 1 : 0.2);
    }
    
    resetHighlight() {
        this.svg.selectAll('path')
            .transition()
            .duration(200)
            .attr('opacity', 0.85);
    }
    
    showTooltipWithData(event, country, year, value) {
        this.tooltip
            .style('opacity', 1)
            .html(`
                <div class="tooltip-title">${country}</div>
                <div style="font-size: 0.8rem; color: #8888a0; margin-bottom: 4px;">Año ${year}</div>
                <div class="tooltip-value">${this.formatNumber(value)}</div>
            `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
    }
    
    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M personas';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K personas';
        }
        return num.toLocaleString('es-ES') + ' personas';
    }
}
