/**
 * Chord Diagram Visualization
 * Regional and country-level migration flow connections
 */

class ChordVisualization {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = null;
        this.temporalData = null;
        this.yearStart = 2000;
        this.yearEnd = 2016;
        this.mode = 'regions';
        this.flowType = 'flows';
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.tooltip = null;
        this.topCount = 12;
        
        this.regions = ['Africa', 'Asia', 'Europe', 'Americas', 'Oceania'];
        this.regionColors = {
            'Africa': '#dc2626',
            'Asia': '#2563eb',
            'Europe': '#7c3aed',
            'Americas': '#ef4444',
            'Oceania': '#3b82f6'
        };
        
        this.countryColors = d3.scaleOrdinal([
            '#dc2626', '#2563eb', '#ef4444', '#3b82f6', '#b91c1c',
            '#1d4ed8', '#f87171', '#60a5fa', '#991b1b', '#1e40af'
        ]);
        
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
        this.createLegend();
    }
    
    createTooltip() {
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute');
    }
    
    createLegend() {
        const legend = document.getElementById('chord-legend');
        if (!legend) return;
        this.updateLegend();
    }
    
    updateLegend() {
        const legend = document.getElementById('chord-legend');
        if (!legend) return;
        
        if (this.flowType === 'flows' && this.mode === 'regions') {
            legend.innerHTML = this.regions.map(region => `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${this.regionColors[region]}"></div>
                    <span>${region}</span>
                </div>
            `).join('');
        } else if (this.flowType === 'sources') {
            legend.innerHTML = '<span style="color: #dc2626; font-size: 0.8rem;">Principales países/regiones emisores de refugiados</span>';
        } else if (this.flowType === 'sinks') {
            legend.innerHTML = '<span style="color: #2563eb; font-size: 0.8rem;">Principales países/regiones receptores de refugiados</span>';
        } else {
            legend.innerHTML = '<span style="color: var(--color-text-muted); font-size: 0.8rem;">Top conexiones entre países</span>';
        }
    }
    
    setData(flows, temporalData) {
        this.data = flows;
        this.temporalData = temporalData;
        this.draw();
    }
    
    setYearRange(start, end) {
        this.yearStart = start;
        this.yearEnd = end;
        this.draw();
    }
    
    setMode(mode) {
        this.mode = mode;
        this.updateLegend();
        this.draw();
    }
    
    setFlowType(type) {
        this.flowType = type;
        this.updateLegend();
        this.draw();
    }
    
    getFilteredData() {
        if (!this.temporalData) return [];
        return this.temporalData.filter(d => d.year >= this.yearStart && d.year <= this.yearEnd);
    }
    
    draw() {
        if (!this.svg) return;
        
        this.svg.selectAll('*').remove();
        
        if (this.flowType === 'flows') {
            if (this.mode === 'regions') {
                this.drawRegionChord();
            } else {
                this.drawCountryChord();
            }
        } else if (this.flowType === 'sources') {
            this.drawBarChart('source', '#dc2626', 'Emisores');
        } else if (this.flowType === 'sinks') {
            this.drawBarChart('target', '#2563eb', 'Receptores');
        }
    }
    
    drawBarChart(field, color, title) {
        const filteredData = this.getFilteredData();
        const aggregated = {};
        
        filteredData.forEach(d => {
            const key = this.mode === 'regions' 
                ? (field === 'source' ? d.sourceRegion : d.targetRegion)
                : d[field];
            if (!key || key === 'unknown') return;
            
            const displayKey = this.mode === 'regions' 
                ? this.capitalizeRegion(key)
                : key;
            
            if (!aggregated[displayKey]) aggregated[displayKey] = 0;
            aggregated[displayKey] += d.value;
        });
        
        const maxBars = this.mode === 'regions' ? 5 : 10;
        const data = Object.entries(aggregated)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, maxBars);
        
        if (data.length === 0) return;
        
        const margin = { top: 50, right: 100, bottom: 20, left: 150 };
        const width = this.width - margin.left - margin.right;
        const height = this.height - margin.top - margin.bottom;
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        const maxValue = d3.max(data, d => d.value);
        
        const x = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, width]);
        
        const y = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height])
            .padding(0.3);
        
        g.append('text')
            .attr('x', width / 2)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e8e8ed')
            .attr('font-size', '16px')
            .attr('font-weight', '600')
            .text(`${title} (${this.yearStart}-${this.yearEnd})`);
        
        const bars = g.selectAll('.bar')
            .data(data)
            .join('g')
            .attr('class', 'bar');
        
        bars.append('rect')
            .attr('x', 0)
            .attr('y', d => y(d.name))
            .attr('height', y.bandwidth())
            .attr('fill', (d, i) => {
                if (this.mode === 'regions') {
                    return this.regionColors[d.name] || color;
                }
                return d3.interpolateRgb(color, '#333')(i / data.length * 0.5);
            })
            .attr('rx', 4)
            .on('mouseover', (event, d) => {
                this.showTooltip(event, d.name, d.value);
            })
            .on('mouseout', () => this.hideTooltip())
            .attr('width', 0)
            .transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('width', d => x(d.value));
        
        bars.append('text')
            .attr('x', -10)
            .attr('y', d => y(d.name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('fill', '#e8e8ed')
            .attr('font-size', '12px')
            .text(d => this.truncateName(d.name, 16));
        
        bars.append('text')
            .attr('class', 'bar-value')
            .attr('y', d => y(d.name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'start')
            .attr('fill', '#e8e8ed')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('opacity', 0)
            .text(d => this.formatNumber(d.value))
            .attr('x', 5)
            .transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('x', d => x(d.value) + 8)
            .attr('opacity', 1);
    }
    
    capitalizeRegion(region) {
        const map = {
            'africa': 'Africa',
            'asia': 'Asia', 
            'europe': 'Europe',
            'americas': 'Americas',
            'oceania': 'Oceania'
        };
        return map[region] || region;
    }
    
    drawRegionChord() {
        const matrix = this.buildRegionMatrix();
        const outerMargin = 120;
        const radius = Math.min(this.width, this.height) / 2 - outerMargin;
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.width/2}, ${this.height/2})`);
        
        const chord = d3.chord()
            .padAngle(0.06)
            .sortSubgroups(d3.descending);
        
        const chords = chord(matrix);
        
        const arc = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius + 15);
        
        const ribbon = d3.ribbon()
            .radius(radius);
        
        const group = g.append('g')
            .selectAll('g')
            .data(chords.groups)
            .join('g');
        
        group.append('path')
            .attr('d', arc)
            .attr('fill', d => this.regionColors[this.regions[d.index]])
            .attr('stroke', '#1a1a24')
            .attr('stroke-width', 1)
            .on('mouseover', (event, d) => {
                this.highlightGroup(d.index);
                this.showTooltip(event, this.regions[d.index], d.value);
            })
            .on('mouseout', () => {
                this.resetHighlight();
                this.hideTooltip();
            });
        
        group.append('text')
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr('dy', '0.35em')
            .attr('transform', d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${radius + 25})
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `)
            .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
            .attr('fill', '#e8e8ed')
            .attr('font-size', '11px')
            .text(d => this.regions[d.index]);
        
        g.append('g')
            .attr('fill-opacity', 0.6)
            .selectAll('path')
            .data(chords)
            .join('path')
            .attr('class', 'chord-ribbon')
            .attr('d', ribbon)
            .attr('fill', d => this.regionColors[this.regions[d.source.index]])
            .attr('stroke', '#1a1a24')
            .attr('stroke-width', 0.3)
            .on('mouseover', (event, d) => {
                const source = this.regions[d.source.index];
                const target = this.regions[d.target.index];
                this.showTooltip(event, `${source} → ${target}`, d.source.value);
            })
            .on('mouseout', () => this.hideTooltip())
            .transition()
            .duration(1000)
            .attrTween('d', d => {
                const i = d3.interpolate(
                    { source: { startAngle: 0, endAngle: 0 }, target: { startAngle: 0, endAngle: 0 } },
                    d
                );
                return t => ribbon(i(t));
            });
    }
    
    drawCountryChord() {
        const { names, matrix } = this.buildCountryMatrix();
        if (names.length === 0) return;
        
        const outerMargin = 120;
        const radius = Math.min(this.width, this.height) / 2 - outerMargin;
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.width/2}, ${this.height/2})`);
        
        const chord = d3.chord()
            .padAngle(0.06)
            .sortSubgroups(d3.descending);
        
        const chords = chord(matrix);
        
        const arc = d3.arc()
            .innerRadius(radius)
            .outerRadius(radius + 15);
        
        const ribbon = d3.ribbon()
            .radius(radius);
        
        const group = g.append('g')
            .selectAll('g')
            .data(chords.groups)
            .join('g');
        
        group.append('path')
            .attr('d', arc)
            .attr('fill', d => this.countryColors(d.index))
            .attr('stroke', '#1a1a24')
            .attr('stroke-width', 1)
            .on('mouseover', (event, d) => {
                this.highlightGroup(d.index);
                this.showTooltip(event, names[d.index], d.value);
            })
            .on('mouseout', () => {
                this.resetHighlight();
                this.hideTooltip();
            });
        
        group.append('text')
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr('dy', '0.35em')
            .attr('transform', d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${radius + 25})
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `)
            .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
            .attr('fill', '#e8e8ed')
            .attr('font-size', '11px')
            .text(d => this.truncateName(names[d.index], 14));
        
        g.append('g')
            .attr('fill-opacity', 0.6)
            .selectAll('path')
            .data(chords)
            .join('path')
            .attr('class', 'chord-ribbon')
            .attr('d', ribbon)
            .attr('fill', d => this.countryColors(d.source.index))
            .attr('stroke', '#1a1a24')
            .attr('stroke-width', 0.3)
            .on('mouseover', (event, d) => {
                const source = names[d.source.index];
                const target = names[d.target.index];
                this.showTooltip(event, `${source} → ${target}`, d.source.value);
            })
            .on('mouseout', () => this.hideTooltip())
            .transition()
            .duration(1000)
            .attrTween('d', d => {
                const i = d3.interpolate(
                    { source: { startAngle: 0, endAngle: 0 }, target: { startAngle: 0, endAngle: 0 } },
                    d
                );
                return t => ribbon(i(t));
            });
    }
    
    buildRegionMatrix() {
        const n = this.regions.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
        
        const regionMap = {
            'africa': 0, 'asia': 1, 'europe': 2, 'americas': 3, 'oceania': 4
        };
        
        const filteredData = this.getFilteredData();
        
        filteredData.forEach(d => {
            const sourceIdx = regionMap[d.sourceRegion];
            const targetIdx = regionMap[d.targetRegion];
            
            if (sourceIdx !== undefined && targetIdx !== undefined) {
                matrix[sourceIdx][targetIdx] += d.value;
            }
        });
        
        return matrix;
    }
    
    buildCountryMatrix() {
        const pairFlows = {};
        const filteredData = this.getFilteredData();
        
        filteredData.forEach(d => {
            const key = `${d.source}|||${d.target}`;
            if (!pairFlows[key]) {
                pairFlows[key] = { source: d.source, target: d.target, flow: 0 };
            }
            pairFlows[key].flow += d.value;
        });
        
        const topPairs = Object.values(pairFlows)
            .sort((a, b) => b.flow - a.flow)
            .slice(0, 10);
        
        const countrySet = new Set();
        topPairs.forEach(p => {
            countrySet.add(p.source);
            countrySet.add(p.target);
        });
        
        const names = Array.from(countrySet);
        const n = names.length;
        
        if (n === 0) return { names: [], matrix: [] };
        
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
        
        const indexMap = {};
        names.forEach((name, i) => indexMap[name] = i);
        
        topPairs.forEach(p => {
            const sourceIdx = indexMap[p.source];
            const targetIdx = indexMap[p.target];
            matrix[sourceIdx][targetIdx] = p.flow;
        });
        
        return { names, matrix };
    }
    
    truncateName(name, maxLength) {
        if (!name) return '';
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 1) + '…';
    }
    
    highlightGroup(index) {
        this.svg.selectAll('.chord-ribbon')
            .transition()
            .duration(200)
            .style('opacity', d => {
                return d.source.index === index || d.target.index === index ? 1 : 0.1;
            });
    }
    
    resetHighlight() {
        this.svg.selectAll('.chord-ribbon')
            .transition()
            .duration(200)
            .style('opacity', 0.7);
    }
    
    showTooltip(event, title, value) {
        this.tooltip
            .style('opacity', 1)
            .html(`
                <div class="tooltip-title">${title}</div>
                <div class="tooltip-value">${this.formatNumber(value)}</div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
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
