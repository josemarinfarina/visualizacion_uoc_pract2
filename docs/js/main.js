/**
 * Main Application Controller
 * Scrollytelling visualization with image sequences
 */

class App {
    constructor() {
        this.data = null;
        this.visualizations = {
            chord: null,
            stream: null,
            force: null
        };
        this.initialized = {
            chord: false,
            stream: false,
            force: false
        };
        this.sequencePlayers = [];
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        
        try {
            this.sequencePlayers = initSequencePlayers();
            
            await this.loadData();
            this.setupScrollAnimations();
            this.setupStatsScroll();
            this.setupControls();
            this.hideLoading();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.hideLoading();
            this.showError('Error al cargar los datos.');
        }
    }
    
    async loadData() {
        this.data = await dataLoader.loadAll();
    }
    
    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(overlay);
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 500);
        }
    }
    
    showError(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center; color: var(--color-accent);">
                    <p style="font-size: 1.2rem;">${message}</p>
                </div>
            `;
        }
    }
    
    setupScrollAnimations() {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100 && scrollIndicator) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.pointerEvents = 'none';
            } else if (scrollIndicator) {
                scrollIndicator.style.opacity = '1';
            }
        }, { passive: true });
        
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.15
        };
        
        const animateOnScroll = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    if (entry.target.classList.contains('stat-card')) {
                        this.animateCounter(entry.target);
                    }
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('[data-animate]').forEach(el => {
            animateOnScroll.observe(el);
        });
        
        const vizObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const vizId = entry.target.id;
                    this.initVisualization(vizId);
                }
            });
        }, { threshold: 0.2 });
        
        document.querySelectorAll('.visualization').forEach(el => {
            vizObserver.observe(el);
        });
    }
    
    setupStatsScroll() {
        const statsSection = document.getElementById('stats');
        if (!statsSection) return;
        
        const statCards = Array.from(statsSection.querySelectorAll('.stat-card'));
        const revealedStats = new Set();
        const bgImage = document.getElementById('stats-bg-image');
        const totalCards = statCards.length;
        
        const typeStatNumber = (card) => {
            const index = parseInt(card.dataset.statIndex);
            if (revealedStats.has(index)) return;
            
            revealedStats.add(index);
            card.classList.add('visible');
            
            const numberEl = card.querySelector('.stat-number');
            const value = numberEl.dataset.statValue;
            
            numberEl.textContent = '';
            
            let charIndex = 0;
            const cursor = document.createElement('span');
            cursor.className = 'typewriter-cursor';
            cursor.textContent = '|';
            numberEl.appendChild(cursor);
            
            const typeChar = () => {
                if (charIndex < value.length) {
                    numberEl.insertBefore(
                        document.createTextNode(value[charIndex]),
                        cursor
                    );
                    charIndex++;
                    setTimeout(typeChar, 80 + Math.random() * 40);
                } else {
                    setTimeout(() => {
                        cursor.classList.add('typewriter-cursor-hidden');
                    }, 1500);
                }
            };
            
            setTimeout(typeChar, 50);
        };
        
        const onScroll = () => {
            const rect = statsSection.getBoundingClientRect();
            const sectionHeight = statsSection.offsetHeight;
            const viewportHeight = window.innerHeight;
            
            const inSection = rect.top < viewportHeight && rect.bottom > 0;
            
            if (!inSection) {
                if (bgImage) bgImage.style.opacity = '0';
                return;
            }
            
            const scrolled = Math.max(0, viewportHeight - rect.top);
            const maxScroll = sectionHeight;
            const progress = scrolled / maxScroll;
            
            for (let i = 0; i < totalCards; i++) {
                const threshold = 0.05 + (i * 0.12);
                if (progress >= threshold && !revealedStats.has(i)) {
                    typeStatNumber(statCards[i]);
                }
            }
            
            if (bgImage) {
                const bgOpacity = Math.min(0.5, progress * 0.6);
                bgImage.style.opacity = bgOpacity.toString();
                
                if (rect.bottom < viewportHeight * 0.5) {
                    bgImage.style.opacity = '0';
                }
            }
        };
        
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
    
    initVisualization(vizId) {
        if (!this.data) return;
        
        switch(vizId) {
            case 'chord-viz':
                if (!this.initialized.chord) {
                    this.initialized.chord = true;
                    this.visualizations.chord = new ChordVisualization('chord-viz');
                    this.visualizations.chord.setData(this.data.flows, this.data.temporal);
                }
                break;
                
            case 'stream-viz':
                if (!this.initialized.stream) {
                    this.initialized.stream = true;
                    this.visualizations.stream = new StreamVisualization('stream-viz');
                    this.visualizations.stream.setData(this.data.temporal);
                }
                break;
                
            case 'force-viz':
                if (!this.initialized.force) {
                    this.initialized.force = true;
                    this.visualizations.force = new ForceVisualization('force-viz');
                    this.visualizations.force.setData(this.data.gender, this.data.transit);
                }
                break;
        }
    }
    
    animateCounter(element) {
        const numberEl = element.querySelector('.stat-number');
        if (!numberEl || numberEl.dataset.animated) return;
        
        numberEl.dataset.animated = 'true';
        const target = parseInt(numberEl.dataset.count);
        const duration = 2000;
        const start = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * easeOut);
            
            numberEl.textContent = this.formatNumber(current);
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K';
        }
        return num.toLocaleString('es-ES');
    }
    
    setupControls() {
        const chordYearStart = document.getElementById('chord-year-start');
        const chordYearEnd = document.getElementById('chord-year-end');
        
        if (chordYearStart) {
            chordYearStart.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const endValue = parseInt(chordYearEnd.value);
                
                if (value > endValue) {
                    chordYearEnd.value = value;
                    document.getElementById('chord-year-end-value').textContent = value;
                }
                
                document.getElementById('chord-year-start-value').textContent = value;
                if (this.visualizations.chord) {
                    this.visualizations.chord.setYearRange(value, Math.max(value, endValue));
                }
            });
        }
        
        if (chordYearEnd) {
            chordYearEnd.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const startValue = parseInt(chordYearStart.value);
                
                if (value < startValue) {
                    chordYearStart.value = value;
                    document.getElementById('chord-year-start-value').textContent = value;
                }
                
                document.getElementById('chord-year-end-value').textContent = value;
                if (this.visualizations.chord) {
                    this.visualizations.chord.setYearRange(Math.min(startValue, value), value);
                }
            });
        }
        
        document.querySelectorAll('[data-chord-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-chord-mode]').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.visualizations.chord) {
                    this.visualizations.chord.setMode(e.target.dataset.chordMode);
                }
            });
        });
        
        document.querySelectorAll('[data-chord-flow]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-chord-flow]').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.visualizations.chord) {
                    this.visualizations.chord.setFlowType(e.target.dataset.chordFlow);
                }
            });
        });
        
        document.querySelectorAll('[data-stream-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-stream-type]').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.visualizations.stream) {
                    this.visualizations.stream.setType(e.target.dataset.streamType);
                }
            });
        });
        
        document.querySelectorAll('[data-force-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-force-filter]').forEach(b => 
                    b.classList.remove('active'));
                e.target.classList.add('active');
                
                if (this.visualizations.force) {
                    this.visualizations.force.setFilter(e.target.dataset.forceFilter);
                }
            });
        });
        
        const forceStrength = document.getElementById('force-strength');
        if (forceStrength) {
            forceStrength.addEventListener('input', (e) => {
                if (this.visualizations.force) {
                    this.visualizations.force.setStrength(parseInt(e.target.value));
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
