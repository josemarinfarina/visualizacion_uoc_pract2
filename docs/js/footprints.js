/**
 * Footprints Trail - Horizontal progress indicator with walking footprints
 * Shows scroll progress as footprints walking along a curved path
 */

class FootprintsTrail {
    constructor() {
        this.container = null;
        this.footprints = [];
        this.totalFootprints = 30;
        this.currentScrollProgress = 0;
        this.pathPoints = [];
        
        this.init();
    }
    
    init() {
        this.createContainer();
        this.generatePath();
        this.createFootprints();
        this.bindScroll();
        this.onScroll();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'footprints-trail';
        document.body.appendChild(this.container);
    }
    
    generatePath() {
        this.pathPoints = [];
        const width = window.innerWidth;
        
        // Path occupies 35% of the screen width, centered
        const pathWidth = width * 0.35;
        const startX = (width - pathWidth) / 2;
        
        // Generate path points - one for each PAIR of footprints
        const numPairs = Math.ceil(this.totalFootprints / 2);
        
        // Seed for pseudo-random but consistent wobble
        const seed = 12345;
        const pseudoRandom = (i) => {
            const x = Math.sin(seed + i * 9.8) * 10000;
            return x - Math.floor(x);
        };
        
        for (let i = 0; i <= numPairs; i++) {
            const progress = i / numPairs;
            const x = startX + (progress * pathWidth);
            
            // Create erratic movement
            const arcHeight = 15;
            const arc = Math.sin(progress * Math.PI) * arcHeight;
            
            // Multiple overlapping waves for irregular feel
            const wave1 = Math.sin(progress * Math.PI * 5) * 6;
            const wave2 = Math.cos(progress * Math.PI * 8 + 1) * 4;
            const wave3 = Math.sin(progress * Math.PI * 12) * 3;
            
            // Add pseudo-random jitter
            const jitterY = (pseudoRandom(i) - 0.5) * 10;
            const jitterX = (pseudoRandom(i + 100) - 0.5) * 8;
            
            // Base Y position
            const y = 55 - arc + wave1 + wave2 + wave3 + jitterY;
            const adjustedX = x + jitterX;
            
            this.pathPoints.push({ x: adjustedX, y, progress });
        }
    }
    
    createFootprintSVG(isLeft) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 30 50');
        svg.setAttribute('width', '11');
        svg.setAttribute('height', '18');
        
        // Footprint shape
        const footPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        footPath.setAttribute('d', `
            M15 4
            C10 4 7 8 7 14
            C7 20 8 28 9 36
            C9.5 40 11 45 15 47
            C19 45 20.5 40 21 36
            C22 28 23 20 23 14
            C23 8 20 4 15 4
            Z
        `);
        footPath.setAttribute('fill', 'currentColor');
        
        // Toe details
        const toes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const toePositions = [
            { cx: 10, cy: 8, r: 2.5 },
            { cx: 15, cy: 6, r: 2.8 },
            { cx: 20, cy: 8, r: 2.5 },
            { cx: 23, cy: 12, r: 2 },
            { cx: 7, cy: 12, r: 2 }
        ];
        
        toePositions.forEach(toe => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            circle.setAttribute('cx', toe.cx);
            circle.setAttribute('cy', toe.cy);
            circle.setAttribute('rx', toe.r);
            circle.setAttribute('ry', toe.r * 1.2);
            circle.setAttribute('fill', 'currentColor');
            toes.appendChild(circle);
        });
        
        svg.appendChild(footPath);
        svg.appendChild(toes);
        
        // Mirror for right foot
        if (!isLeft) {
            svg.style.transform = 'scaleX(-1)';
        }
        
        return svg;
    }
    
    getPathAngle(pairIndex) {
        if (pairIndex <= 0 || pairIndex >= this.pathPoints.length - 1) return 90;
        
        const prev = this.pathPoints[Math.max(0, pairIndex - 1)];
        const next = this.pathPoints[Math.min(this.pathPoints.length - 1, pairIndex + 1)];
        
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        
        return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    }
    
    createFootprints() {
        for (let i = 0; i < this.totalFootprints; i++) {
            const footprint = document.createElement('div');
            footprint.className = 'footprint';
            
            const isLeft = i % 2 === 0;
            footprint.classList.add(isLeft ? 'foot-left' : 'foot-right');
            
            const svg = this.createFootprintSVG(isLeft);
            footprint.appendChild(svg);
            
            this.positionFootprint(footprint, i, isLeft);
            
            footprint.dataset.index = i;
            
            this.container.appendChild(footprint);
            this.footprints.push(footprint);
        }
    }
    
    positionFootprint(footprint, index, isLeft) {
        // Each pair of feet (left+right) shares a position on the path
        const pairIndex = Math.floor(index / 2);
        const point = this.pathPoints[pairIndex];
        if (!point) return;
        
        const angle = this.getPathAngle(pairIndex);
        
        // For horizontal walking (left to right):
        // - Left foot goes slightly UP (negative Y)
        // - Right foot goes slightly DOWN (positive Y)
        // This creates side-by-side appearance
        const verticalOffset = isLeft ? -10 : 1;
        
        // Small horizontal offset so feet aren't perfectly aligned vertically
        const horizontalOffset = isLeft ? -4 : 4;
        
        footprint.style.left = `${point.x + horizontalOffset}px`;
        footprint.style.top = `${point.y + verticalOffset}px`;
        
        // Rotate feet to point in walking direction, with slight inward angle
        footprint.style.transform = `rotate(${angle + (isLeft ? -10 : 20)}deg)`;
    }
    
    bindScroll() {
        let ticking = false;
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.onScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.generatePath();
            this.repositionFootprints();
        });
    }
    
    repositionFootprints() {
        this.footprints.forEach((footprint, i) => {
            const isLeft = i % 2 === 0;
            this.positionFootprint(footprint, i, isLeft);
        });
    }
    
    onScroll() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.currentScrollProgress = docHeight > 0 ? scrollTop / docHeight : 0;
        
        this.updateFootprints();
    }
    
    updateFootprints() {
        // Progress is based on pairs, not individual footprints
        const activePairIndex = Math.floor(this.currentScrollProgress * (this.totalFootprints / 2));
        const activeIndex = activePairIndex * 2 + 1; // Both feet of the pair
        
        this.footprints.forEach((footprint, index) => {
            const isActive = index <= activeIndex;
            const pairIndex = Math.floor(index / 2);
            const currentPair = Math.floor(activeIndex / 2);
            const isRecent = pairIndex === currentPair;
            
            footprint.classList.toggle('active', isActive);
            footprint.classList.toggle('recent', isRecent);
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new FootprintsTrail();
    }, 300);
});
