/**
 * Scroll-driven Image Sequence Player
 * Lazy loads images progressively for better performance
 */

const TOP_EMITTERS_BY_YEAR = {
    2000: [
        { name: 'Afghanistan', value: '3.6M' },
        { name: 'Burundi', value: '568K' },
        { name: 'Iraq', value: '526K' },
        { name: 'Bosnia', value: '505K' },
        { name: 'Sudan', value: '494K' }
    ],
    2001: [
        { name: 'Afghanistan', value: '3.8M' },
        { name: 'Burundi', value: '554K' },
        { name: 'Iraq', value: '530K' },
        { name: 'Sudan', value: '489K' },
        { name: 'Angola', value: '470K' }
    ],
    2002: [
        { name: 'Afghanistan', value: '2.5M' },
        { name: 'Burundi', value: '574K' },
        { name: 'Sudan', value: '508K' },
        { name: 'Angola', value: '435K' },
        { name: 'Somalia', value: '432K' }
    ],
    2003: [
        { name: 'Afghanistan', value: '2.1M' },
        { name: 'Sudan', value: '606K' },
        { name: 'Burundi', value: '531K' },
        { name: 'DR Congo', value: '453K' },
        { name: 'Somalia', value: '402K' }
    ],
    2004: [
        { name: 'Afghanistan', value: '2.4M' },
        { name: 'Sudan', value: '730K' },
        { name: 'Burundi', value: '485K' },
        { name: 'DR Congo', value: '462K' },
        { name: 'Somalia', value: '389K' }
    ],
    2005: [
        { name: 'Afghanistan', value: '2.2M' },
        { name: 'Sudan', value: '693K' },
        { name: 'Burundi', value: '438K' },
        { name: 'DR Congo', value: '430K' },
        { name: 'Somalia', value: '395K' }
    ],
    2006: [
        { name: 'Afghanistan', value: '2.1M' },
        { name: 'Iraq', value: '1.5M' },
        { name: 'Sudan', value: '686K' },
        { name: 'Somalia', value: '464K' },
        { name: 'DR Congo', value: '401K' }
    ],
    2007: [
        { name: 'Afghanistan', value: '3.1M' },
        { name: 'Iraq', value: '2.3M' },
        { name: 'Colombia', value: '552K' },
        { name: 'Sudan', value: '522K' },
        { name: 'Somalia', value: '457K' }
    ],
    2008: [
        { name: 'Afghanistan', value: '2.8M' },
        { name: 'Iraq', value: '1.9M' },
        { name: 'Somalia', value: '561K' },
        { name: 'Sudan', value: '419K' },
        { name: 'Colombia', value: '373K' }
    ],
    2009: [
        { name: 'Afghanistan', value: '2.9M' },
        { name: 'Iraq', value: '1.8M' },
        { name: 'Somalia', value: '678K' },
        { name: 'DR Congo', value: '455K' },
        { name: 'Myanmar', value: '406K' }
    ],
    2010: [
        { name: 'Afghanistan', value: '3.1M' },
        { name: 'Iraq', value: '1.7M' },
        { name: 'Somalia', value: '769K' },
        { name: 'DR Congo', value: '476K' },
        { name: 'Myanmar', value: '415K' }
    ],
    2011: [
        { name: 'Afghanistan', value: '2.7M' },
        { name: 'Iraq', value: '1.4M' },
        { name: 'Somalia', value: '1.1M' },
        { name: 'Sudan', value: '500K' },
        { name: 'DR Congo', value: '491K' }
    ],
    2012: [
        { name: 'Afghanistan', value: '2.6M' },
        { name: 'Somalia', value: '1.1M' },
        { name: 'Iraq', value: '746K' },
        { name: 'Syria', value: '729K' },
        { name: 'Sudan', value: '568K' }
    ],
    2013: [
        { name: 'Afghanistan', value: '2.6M' },
        { name: 'Syria', value: '2.5M' },
        { name: 'Somalia', value: '1.1M' },
        { name: 'Sudan', value: '648K' },
        { name: 'DR Congo', value: '499K' }
    ],
    2014: [
        { name: 'Syria', value: '3.9M' },
        { name: 'Afghanistan', value: '2.6M' },
        { name: 'Somalia', value: '1.1M' },
        { name: 'Sudan', value: '665K' },
        { name: 'South Sudan', value: '616K' }
    ],
    2015: [
        { name: 'Syria', value: '4.9M' },
        { name: 'Afghanistan', value: '2.7M' },
        { name: 'Somalia', value: '1.1M' },
        { name: 'South Sudan', value: '778K' },
        { name: 'Sudan', value: '627K' }
    ],
    2016: [
        { name: 'Syria', value: '5.5M' },
        { name: 'Afghanistan', value: '2.5M' },
        { name: 'South Sudan', value: '1.4M' },
        { name: 'Somalia', value: '1.0M' },
        { name: 'Sudan', value: '650K' }
    ]
};

class SequencePlayer {
    constructor(sectionId, canvasId) {
        this.section = document.getElementById(sectionId);
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        
        if (!this.section || !this.canvas) {
            console.warn(`SequencePlayer: Section ${sectionId} or canvas ${canvasId} not found`);
            return;
        }
        
        this.sequenceName = this.section.dataset.sequence;
        this.startFrame = parseInt(this.section.dataset.start) || 1;
        this.endFrame = parseInt(this.section.dataset.end) || 100;
        this.totalFrames = this.endFrame - this.startFrame + 1;
        this.pattern = this.section.dataset.pattern || 'render{frame}.png';
        this.padding = parseInt(this.section.dataset.padding) || 3;
        
        this.framesPerYear = parseInt(this.section.dataset.framesPerYear) || 0;
        this.startYear = parseInt(this.section.dataset.startYear) || 2000;
        this.hasYearIndicator = this.framesPerYear > 0;
        
        this.yearValueEl = document.getElementById('year-value');
        this.countriesListEl = document.getElementById('countries-list');
        this.currentYear = this.startYear;
        
        this.images = new Array(this.totalFrames).fill(null);
        this.loadingFrames = new Set();
        this.currentFrame = 0;
        this.overlay = this.section.querySelector('.sequence-overlay');
        this.bufferSize = 15;
        
        this.drawWidth = 0;
        this.drawHeight = 0;
        this.drawX = 0;
        this.drawY = 0;
        this.initialized = false;
        
        this.init();
    }
    
    async init() {
        await this.loadFrame(0);
        this.setupCanvas();
        this.bindScroll();
        this.drawFrame(0);
        this.initialized = true;
        this.preloadBuffer(0);
        
        if (this.hasYearIndicator) {
            this.updateYearIndicator(this.startYear);
        }
    }
    
    getFrameSrc(frameIndex) {
        const frameNum = (this.startFrame + frameIndex).toString().padStart(this.padding, '0');
        const filename = this.pattern.replace('{frame}', frameNum);
        return `${this.sequenceName}/${filename}`;
    }
    
    async loadFrame(frameIndex) {
        if (frameIndex < 0 || frameIndex >= this.totalFrames) return null;
        if (this.images[frameIndex]) return this.images[frameIndex];
        if (this.loadingFrames.has(frameIndex)) return null;
        
        this.loadingFrames.add(frameIndex);
        
        const src = this.getFrameSrc(frameIndex);
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.images[frameIndex] = img;
                this.loadingFrames.delete(frameIndex);
                resolve(img);
            };
            img.onerror = () => {
                this.loadingFrames.delete(frameIndex);
                resolve(null);
            };
            img.src = src;
        });
    }
    
    preloadBuffer(centerFrame) {
        const start = Math.max(0, centerFrame - this.bufferSize);
        const end = Math.min(this.totalFrames - 1, centerFrame + this.bufferSize);
        
        for (let i = start; i <= end; i++) {
            if (!this.images[i] && !this.loadingFrames.has(i)) {
                this.loadFrame(i);
            }
        }
    }
    
    setupCanvas() {
        const firstImage = this.images[0];
        if (!firstImage) return;
        
        const imageAspect = firstImage.width / firstImage.height;
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const viewportAspect = viewportWidth / viewportHeight;
        
        this.canvas.width = viewportWidth;
        this.canvas.height = viewportHeight;
        
        if (viewportAspect > imageAspect) {
            this.drawWidth = viewportWidth;
            this.drawHeight = viewportWidth / imageAspect;
            this.drawX = 0;
            this.drawY = (viewportHeight - this.drawHeight) / 2;
        } else {
            this.drawHeight = viewportHeight;
            this.drawWidth = viewportHeight * imageAspect;
            this.drawX = (viewportWidth - this.drawWidth) / 2;
            this.drawY = 0;
        }
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
        
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.drawFrame(this.currentFrame);
        });
    }
    
    onScroll() {
        if (!this.initialized) return;
        
        const rect = this.section.getBoundingClientRect();
        const sectionHeight = this.section.offsetHeight;
        const viewportHeight = window.innerHeight;
        
        const scrollStart = -rect.top;
        const scrollRange = sectionHeight - viewportHeight;
        
        const isInView = rect.top < viewportHeight && rect.bottom > 0;
        
        if (isInView) {
            this.section.classList.add('in-view');
        } else {
            this.section.classList.remove('in-view');
        }
        
        if (scrollStart < 0) {
            this.updateOverlay(false);
            return;
        }
        
        if (scrollStart > scrollRange) {
            this.drawFrame(this.totalFrames - 1);
            this.updateOverlay(false);
            if (this.hasYearIndicator) {
                this.updateYearIndicator(2016);
            }
            return;
        }
        
        const progress = Math.max(0, Math.min(1, scrollStart / scrollRange));
        const frameIndex = Math.floor(progress * (this.totalFrames - 1));
        
        if (frameIndex !== this.currentFrame) {
            this.currentFrame = frameIndex;
            this.drawFrame(frameIndex);
            this.preloadBuffer(frameIndex);
            
            if (this.hasYearIndicator) {
                const year = this.startYear + Math.floor(frameIndex / this.framesPerYear);
                const clampedYear = Math.min(2016, Math.max(2000, year));
                if (clampedYear !== this.currentYear) {
                    this.currentYear = clampedYear;
                    this.updateYearIndicator(clampedYear);
                }
            }
        }
        
        this.updateOverlay(progress > 0.05 && progress < 0.95);
    }
    
    updateYearIndicator(year) {
        if (!this.yearValueEl || !this.countriesListEl) return;
        
        this.yearValueEl.textContent = year;
        
        const countries = TOP_EMITTERS_BY_YEAR[year] || [];
        this.countriesListEl.innerHTML = countries.map(c => `
            <li>
                <span class="country-name">${c.name}</span>
                <span class="country-value">${c.value}</span>
            </li>
        `).join('');
    }
    
    async drawFrame(index) {
        if (!this.ctx) return;
        
        let img = this.images[index];
        
        if (!img) {
            img = await this.loadFrame(index);
            if (!img && this.images[0]) {
                img = this.images[0];
            }
        }
        
        if (!img) return;
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.drawWidth && this.drawHeight) {
            this.ctx.drawImage(img, this.drawX, this.drawY, this.drawWidth, this.drawHeight);
        } else {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    updateOverlay(show) {
        if (this.overlay) {
            if (show) {
                this.overlay.classList.add('visible');
            } else {
                this.overlay.classList.remove('visible');
            }
        }
    }
}

function initSequencePlayers() {
    const sequences = document.querySelectorAll('.sequence-section');
    const players = [];
    
    sequences.forEach((section, index) => {
        const canvasId = `sequence-canvas-${index + 1}`;
        const player = new SequencePlayer(section.id, canvasId);
        players.push(player);
    });
    
    return players;
}
