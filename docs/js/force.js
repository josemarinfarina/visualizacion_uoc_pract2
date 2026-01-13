/**
 * Force-Directed Graph Visualization
 * Transit nodes and gender analysis
 */

class ForceVisualization {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.genderData = null;
        this.transitData = null;
        this.filter = 'all';
        this.strength = -200;
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.simulation = null;
        this.tooltip = null;
        this.nodes = [];
        this.links = [];
        
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
        
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .append('path')
            .attr('d', 'M 0,-5 L 10,0 L 0,5')
            .attr('fill', '#666');
        
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
        const legend = document.getElementById('force-legend');
        if (!legend) return;
        
        legend.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background: linear-gradient(90deg, #b2182b, #f7f7f7, #2166ac); width: 100px;"></div>
                <span>Color: Desviación de género (rojo=+mujeres, azul=+hombres)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #888; width: 20px; height: 20px; border-radius: 50%"></div>
                <span>Tamaño: Volumen total (entradas + salidas)</span>
            </div>
            <div id="filter-description" class="filter-description"></div>
        `;
        
        this.updateFilterDescription('all');
    }
    
    updateFilterDescription(filter) {
        const desc = document.getElementById('filter-description');
        if (!desc) return;
        
        const descriptions = {
            'all': {
                title: 'Todos los flujos',
                text: 'Muestra todas las rutas migratorias. El color indica desviación de la proporción 50/50: rojo = más mujeres, azul = más hombres, blanco = equilibrado.'
            },
            'high-female': {
                title: 'Mayoría mujeres (>55%)',
                text: 'Rutas donde más del 55% son mujeres. Puede indicar desplazamiento de familias (mujeres con niños) o flujos donde los hombres permanecen en zonas de conflicto.'
            },
            'low-female': {
                title: 'Mayoría hombres (>55%)',
                text: 'Rutas donde más del 55% son hombres. Típico de migración laboral o fases iniciales de conflicto donde los hombres emigran primero.'
            },
            'high-children': {
                title: 'Alto porcentaje de menores (>30%)',
                text: 'Rutas donde más del 30% son menores de 18 años. Indica alta vulnerabilidad: familias desplazadas o menores no acompañados huyendo de conflictos.'
            }
        };
        
        const info = descriptions[filter] || descriptions['all'];
        
        desc.innerHTML = `
            <div class="filter-desc-title">${info.title}</div>
            <div class="filter-desc-text">${info.text}</div>
        `;
    }
    
    setData(genderData, transitData) {
        this.genderData = genderData;
        this.transitData = transitData;
        this.processData();
        this.draw();
    }
    
    setFilter(filter) {
        this.filter = filter;
        this.updateFilterDescription(filter);
        this.processData();
        this.draw();
    }
    
    setStrength(strength) {
        this.strength = strength;
        if (this.simulation) {
            this.simulation.force('charge', d3.forceManyBody()
                .strength(strength)
                .distanceMin(20)
                .distanceMax(300));
            this.simulation.alpha(0.3).restart();
        }
    }
    
    processData() {
        const nodeMap = new Map();
        const linkMap = new Map();
        
        let data = this.genderData || [];
        
        if (this.filter === 'high-female') {
            data = data.filter(d => d.femaleRatio > 0.55);
        } else if (this.filter === 'low-female') {
            data = data.filter(d => d.femaleRatio < 0.45);
        } else if (this.filter === 'high-children') {
            data = data.filter(d => d.childrenRatio > 0.3);
        } else if (this.filter === 'high-rejection' && this.transitData) {
            const highRejection = new Set(
                this.transitData
                    .filter(d => d.rejectionRate > 0.5)
                    .flatMap(d => [d.source, d.target])
            );
            data = data.filter(d => highRejection.has(d.source) || highRejection.has(d.target));
        }
        
        const aggregated = {};
        data.forEach(d => {
            const key = `${d.source}-${d.target}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    source: d.source,
                    target: d.target,
                    totalFlow: 0,
                    weightedFemaleRatio: 0,
                    weightedChildrenRatio: 0
                };
            }
            aggregated[key].totalFlow += d.totalFlow;
            aggregated[key].weightedFemaleRatio += d.femaleRatio * d.totalFlow;
            aggregated[key].weightedChildrenRatio += d.childrenRatio * d.totalFlow;
        });
        
        const links = Object.values(aggregated)
            .filter(d => d.totalFlow > 10000)
            .sort((a, b) => b.totalFlow - a.totalFlow)
            .slice(0, 100);
        
        links.forEach(d => {
            const femaleRatio = d.totalFlow > 0 ? d.weightedFemaleRatio / d.totalFlow : 0;
            const childrenRatio = d.totalFlow > 0 ? d.weightedChildrenRatio / d.totalFlow : 0;
            
            if (!nodeMap.has(d.source)) {
                nodeMap.set(d.source, {
                    id: d.source,
                    totalOut: 0,
                    totalIn: 0,
                    weightedFemaleRatio: 0,
                    weightedChildrenRatio: 0
                });
            }
            if (!nodeMap.has(d.target)) {
                nodeMap.set(d.target, {
                    id: d.target,
                    totalOut: 0,
                    totalIn: 0,
                    weightedFemaleRatio: 0,
                    weightedChildrenRatio: 0
                });
            }
            
            const sourceNode = nodeMap.get(d.source);
            sourceNode.totalOut += d.totalFlow;
            sourceNode.weightedFemaleRatio += femaleRatio * d.totalFlow;
            sourceNode.weightedChildrenRatio += childrenRatio * d.totalFlow;
            
            const targetNode = nodeMap.get(d.target);
            targetNode.totalIn += d.totalFlow;
            
            linkMap.set(`${d.source}-${d.target}`, {
                source: d.source,
                target: d.target,
                value: d.totalFlow,
                femaleRatio,
                childrenRatio
            });
        });
        
        this.nodes = Array.from(nodeMap.values()).map(n => {
            const total = n.totalOut + n.totalIn;
            return {
                ...n,
                avgFemaleRatio: n.totalOut > 0 ? n.weightedFemaleRatio / n.totalOut : 0,
                avgChildrenRatio: n.totalOut > 0 ? n.weightedChildrenRatio / n.totalOut : 0,
                total
            };
        });
        
        this.links = Array.from(linkMap.values());
    }
    
    draw() {
        if (!this.svg || this.nodes.length === 0) return;
        
        this.svg.selectAll('g.main').remove();
        
        const g = this.svg.append('g').attr('class', 'main');
        
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(this.nodes, d => d.total)])
            .range([4, 30]);
        
        const colorScale = d3.scaleDiverging(d3.interpolateRdBu)
            .domain([0.65, 0.5, 0.35]);
        
        const linkWidthScale = d3.scaleSqrt()
            .domain([0, d3.max(this.links, d => d.value)])
            .range([0.5, 4]);
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const padding = 80;
        
        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.links)
                .id(d => d.id)
                .distance(100)
                .strength(0.3))
            .force('charge', d3.forceManyBody()
                .strength(this.strength)
                .distanceMin(20)
                .distanceMax(300))
            .force('center', d3.forceCenter(centerX, centerY).strength(0.1))
            .force('x', d3.forceX(centerX).strength(0.05))
            .force('y', d3.forceY(centerY).strength(0.05))
            .force('collision', d3.forceCollide().radius(d => radiusScale(d.total) + 8))
            .force('bounds', () => {
                this.nodes.forEach(d => {
                    d.x = Math.max(padding, Math.min(this.width - padding, d.x));
                    d.y = Math.max(padding, Math.min(this.height - padding, d.y));
                });
            });
        
        const link = g.append('g')
            .selectAll('line')
            .data(this.links)
            .join('line')
            .attr('stroke', d => colorScale(d.femaleRatio))
            .attr('stroke-width', d => linkWidthScale(d.value))
            .attr('stroke-opacity', 0.6)
            .attr('marker-end', 'url(#arrowhead)');
        
        const node = g.append('g')
            .selectAll('g')
            .data(this.nodes)
            .join('g')
            .call(this.drag(this.simulation))
            .on('mouseover', (event, d) => this.showNodeTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());
        
        node.append('circle')
            .attr('r', d => radiusScale(d.total))
            .attr('fill', d => colorScale(d.avgFemaleRatio))
            .attr('stroke', '#1a1a24')
            .attr('stroke-width', 1.5)
            .transition()
            .duration(1000)
            .attr('opacity', 1);
        
        node.filter(d => radiusScale(d.total) > 10)
            .append('text')
            .text(d => d.id.substring(0, 3))
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', 'white')
            .attr('font-size', '8px')
            .attr('pointer-events', 'none');
        
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });
        
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        this.svg.call(zoom);
    }
    
    drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
    
    showNodeTooltip(event, d) {
        const type = d.totalOut > d.totalIn ? 'Emisor' : 'Receptor';
        const hasGenderData = d.totalOut > 0;
        
        let genderInfo = '';
        if (hasGenderData) {
            const femalePercent = (d.avgFemaleRatio * 100).toFixed(1);
            const deviation = ((d.avgFemaleRatio - 0.5) * 100).toFixed(1);
            const deviationSign = deviation >= 0 ? '+' : '';
            const deviationLabel = deviation >= 0 ? 'más mujeres' : 'más hombres';
            
            genderInfo = `
                Mujeres/Hombres: ${femalePercent}% / ${(100 - femalePercent).toFixed(1)}%<br>
                Desviación: <strong>${deviationSign}${deviation}%</strong> (${deviationLabel})<br>
                Menores: ${(d.avgChildrenRatio * 100).toFixed(1)}%
            `;
        } else {
            genderInfo = '<span style="color: #666;">Sin datos demográficos (solo receptor)</span>';
        }
        
        this.tooltip
            .style('opacity', 1)
            .html(`
                <div class="tooltip-title">${d.id}</div>
                <div style="font-size: 0.8rem; color: #8888a0;">${type}</div>
                <div class="tooltip-value">
                    Salidas: ${this.formatNumber(d.totalOut)}<br>
                    Entradas: ${this.formatNumber(d.totalIn)}<br>
                    ${genderInfo}
                </div>
            `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
    }
    
    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K';
        }
        return num.toLocaleString('es-ES');
    }
}
