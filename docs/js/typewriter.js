/**
 * Typewriter Effect Module
 * Creates authentic typewriter animations for text elements
 */

class TypewriterEffect {
    /**
     * Initialize a typewriter effect on an element.
     * @param {HTMLElement} element - The element to animate
     * @param {Object} options - Configuration options
     */
    constructor(element, options = {}) {
        if (element.dataset.typewriterStarted) return;
        element.dataset.typewriterStarted = 'true';
        
        this.element = element;
        this.text = element.textContent.trim();
        this.options = {
            speed: options.speed || 60,
            delay: options.delay || 0,
            cursor: options.cursor !== false,
            cursorChar: options.cursorChar || '|',
            onComplete: options.onComplete || null,
            variation: options.variation !== false
        };
        
        this.element.textContent = '';
        this.element.classList.add('typewriter-element');
        
        if (this.options.cursor) {
            this.cursor = document.createElement('span');
            this.cursor.className = 'typewriter-cursor';
            this.cursor.textContent = this.options.cursorChar;
            this.element.appendChild(this.cursor);
        }
        
        this.index = 0;
        this.completed = false;
    }

    /**
     * Start the typewriter animation.
     */
    start() {
        if (this.completed || !this.text) return;
        
        setTimeout(() => {
            this.type();
        }, this.options.delay);
    }

    /**
     * Type the next character.
     */
    type() {
        if (this.index < this.text.length) {
            const char = this.text[this.index];
            
            if (this.cursor) {
                this.element.insertBefore(
                    document.createTextNode(char),
                    this.cursor
                );
            } else {
                this.element.textContent += char;
            }
            
            this.index++;
            
            let delay = this.options.speed;
            if (this.options.variation) {
                delay += Math.random() * 40 - 20;
                if (char === ' ' || char === '.' || char === ',') {
                    delay += 30;
                }
            }
            
            setTimeout(() => this.type(), delay);
        } else {
            this.completed = true;
            this.element.classList.add('typewriter-complete');
            
            if (this.options.cursor) {
                setTimeout(() => {
                    this.cursor.classList.add('typewriter-cursor-hidden');
                }, 2000);
            }
            
            if (this.options.onComplete) {
                this.options.onComplete();
            }
        }
    }
}

let heroInitialized = false;

function initHeroTypewriter() {
    if (heroInitialized) return;
    heroInitialized = true;
    
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;
    
    const titleLines = heroTitle.querySelectorAll('.title-line');
    if (!titleLines.length) return;
    
    const fullText = Array.from(titleLines).map(line => line.textContent.trim());
    
    titleLines.forEach(line => {
        line.textContent = '';
        line.style.minHeight = '1.2em';
    });
    
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    cursor.textContent = '|';
    
    let currentLineIndex = 0;
    let currentCharIndex = 0;
    
    titleLines[0].appendChild(cursor);
    
    const typeNextChar = () => {
        if (currentLineIndex >= fullText.length) {
            setTimeout(() => {
                cursor.classList.add('typewriter-cursor-hidden');
                animateSubtitle();
            }, 1500);
            return;
        }
        
        const currentLine = fullText[currentLineIndex];
        
        if (currentCharIndex < currentLine.length) {
            const char = currentLine[currentCharIndex];
            titleLines[currentLineIndex].insertBefore(
                document.createTextNode(char),
                cursor
            );
            currentCharIndex++;
            
            const delay = 70 + Math.random() * 30;
            setTimeout(typeNextChar, delay);
        } else {
            currentLineIndex++;
            currentCharIndex = 0;
            
            if (currentLineIndex < fullText.length) {
                titleLines[currentLineIndex].appendChild(cursor);
                setTimeout(typeNextChar, 200);
            } else {
                typeNextChar();
            }
        }
    };
    
    setTimeout(typeNextChar, 500);
}

function animateSubtitle() {
    const subtitle = document.querySelector('.hero-subtitle');
    if (!subtitle || subtitle.dataset.typewriterStarted) return;
    
    subtitle.style.opacity = '1';
    
    new TypewriterEffect(subtitle, {
        speed: 15,
        cursor: true,
        variation: true
    }).start();
}

document.addEventListener('DOMContentLoaded', () => {
    initHeroTypewriter();
});
