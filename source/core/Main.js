// Get the mode from localStorage or default to false
const ultraLowPerformanceMode = localStorage.getItem('ultraLowPerformanceMode') === 'true';

// Log the current mode
console.log(`Ultra Optimized Mode: ${ultraLowPerformanceMode ? 'Activated' : 'Deactivated'}`);

// Performance settings based on mode
const perfSettings = {
    // Rendering
    renderer: ultraLowPerformanceMode ? Phaser.CANVAS : Phaser.AUTO, // AUTO for WebGL when possible
    resolution: ultraLowPerformanceMode ? 1.0 : 1.5,
    maxTextures: ultraLowPerformanceMode ? 10 : 32,
    textureQuality: ultraLowPerformanceMode ? 0.3 : 1.0,
    
    // Audio
    maxAudio: ultraLowPerformanceMode ? 1 : 8,
    audioVolume: ultraLowPerformanceMode ? 0.3 : 1.0,
    
    // System
    fps: ultraLowPerformanceMode ? 40 : 120, // High performance mode uses 120 FPS
    physicsFPS: ultraLowPerformanceMode ? 20 : 60,
    gcInterval: ultraLowPerformanceMode ? 30000 : 60000,
    
    // Features
    disable: {
        antialias: ultraLowPerformanceMode,
        advancedBlending: ultraLowPerformanceMode,
        webAudio: ultraLowPerformanceMode,
        audioPositioning: ultraLowPerformanceMode,
        soundEffects: ultraLowPerformanceMode,
        textureMipmaps: ultraLowPerformanceMode,
        shadows: ultraLowPerformanceMode,
        particles: ultraLowPerformanceMode,
        filters: ultraLowPerformanceMode
    }
};

import { initVolumeControl, setVolumeUI, setCurrentScene, setVolumeSounds } from './soundtray.js';
import { MainScene } from './MainScene.js';
import { CrashHandler } from './CrashHandler.js';

class UltraOptimizedScene extends Phaser.Scene {
    constructor(config) {
        super(config);
    }

    preload() {
        // Configure ultra-light loader
        this.load.maxParallelDownloads = ultraLowPerformanceMode ? 2 : 4;
        
        // Patch loader methods for extreme optimization
        this.load.image = this.createOptimizedLoader(this.load.image.bind(this.load), 'image');
        this.load.audio = this.createOptimizedLoader(this.load.audio.bind(this.load), 'audio');
        this.load.spritesheet = this.createOptimizedLoader(this.load.spritesheet.bind(this.load), 'spritesheet');
    }

    createOptimizedLoader(originalFn, type) {
        return (key, url, config) => {
            config = config || {};
            
            if (ultraLowPerformanceMode) {
                switch(type) {
                    case 'image':
                    case 'spritesheet':
                        config.mipmapFilter = null;
                        break;
                        
                    case 'audio':
                        config.volume = perfSettings.audioVolume;
                        config.instances = Math.min(1, config.instances || 1);
                        break;
                }
            }
            
            return originalFn(key, url, config);
        };
    }

    create() {
        if (ultraLowPerformanceMode) {
            this.applyExtremeOptimizations();
        }
    }

    applyExtremeOptimizations() {
        // 1. Texture Optimizations
        this.textures.getTextureKeys().forEach(key => {
            const texture = this.textures.get(key);
            if (texture) {
                // Force nearest-neighbor scaling
                texture.setFilter(0); // 0 = NEAREST
                
                // Reduce texture quality
                if (texture.source && texture.source[0]) {
                    texture.source[0].scaleMode = 0; // NEAREST
                    texture.source[0].resolution = 0.3;
                }
            }
        });

        // 2. Display Object Optimizations
        this.children.each(child => {
            if (child) {
                // Scale down sprites
                if (child.setScale) child.setScale(perfSettings.textureQuality);
                
                // Reduce alpha slightly to help performance
                if (child.setAlpha) child.setAlpha(0.95);
                
                // Disable depth sorting
                if (child.setDepth) child.setDepth(1);
                
                // Disable interpolation
                if (child.setInterpolation) child.setInterpolation(0);
                
                // Disable masks and effects
                if (child.clearMask) child.clearMask();
                if (child.clearTint) child.clearTint();
                if (child.preFX) child.preFX.clear();
                if (child.postFX) child.postFX.clear();
            }
        });

        // 3. Camera Optimizations
        if (this.cameras && this.cameras.main) {
            this.cameras.main.roundPixels = true;
            this.cameras.main.useBitmapData = false;
        }
    }

    setupGarbageCollection() {
        this.cleanupInterval = setInterval(() => {
            // Clean texture cache
            const textures = this.textures.getTextureKeys();
            if (textures.length > perfSettings.maxTextures) {
                textures.slice(0, textures.length - perfSettings.maxTextures).forEach(key => {
                    const texture = this.textures.get(key);
                    if (texture && !texture.referenceCount) {
                        this.textures.remove(key);
                    }
                });
            }

            // Clean audio cache
            if (this.sound && this.sound.sounds) {
                this.sound.sounds.forEach(sound => {
                    if (!sound.isPlaying) {
                        sound.destroy();
                    }
                });
            }

            // Force GC if available
            if (window.gc) window.gc();
        }, perfSettings.gcInterval);
    }

    shutdown() {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    }
}

// Modified VolumeUIScene with extreme optimizations
class VolumeUIScene extends UltraOptimizedScene {
    constructor() {
        super({ key: 'VolumeUIScene', active: true });
    }

    preload() {
        super.preload();
        
        // Load fonts
        this.load.binary('fnf_font', 'public/assets/fonts/FridayNightFunkin-Regular.ttf');
        this.load.binary('vcr_font', 'public/assets/fonts/vcr.ttf');
        
        // Load UI elements with optimized settings
        this.load.image('volumeBox', 'public/assets/images/UI/soundtray/volumebox.png');
        for (let i = 1; i <= 10; i++) {
            this.load.image(`volumeBar${i}`, `public/assets/images/UI/soundtray/bars_${i}.png`);
        }
        
        // Load sounds with optimized config
        const audioConfig = {
            volume: perfSettings.audioVolume,
            instances: ultraLowPerformanceMode ? 1 : 3
        };
        this.load.audio('volUp', 'public/assets/audio/sounds/soundtray/Volup.ogg', audioConfig);
        this.load.audio('volDown', 'public/assets/audio/sounds/soundtray/Voldown.ogg', audioConfig);
        this.load.audio('volMax', 'public/assets/audio/sounds/soundtray/VolMAX.ogg', audioConfig);
    }

    create() {
        super.create();
        
        // Load fonts using WebFontLoader
        const WebFontConfig = {
            custom: {
                families: ['FNF', 'VCR'],
                urls: ['public/html/index.css']
            },
            active: () => console.log('Fonts loaded')
        };
        // @ts-ignore
        WebFont.load(WebFontConfig);

        // UI setup with optimizations
        const initialY = -70;
        const showY = 80;
        const barOffset = -22;
        
        this.volumeUI = {
            box: this.add.sprite(640, initialY, 'volumeBox'),
            barBackground: this.add.sprite(640, initialY + barOffset, 'volumeBar10'),
            bar: this.add.sprite(640, initialY + barOffset, 'volumeBar1')
        };
        
        // Apply quality reductions
        if (ultraLowPerformanceMode) {
            [this.volumeUI.box, this.volumeUI.barBackground, this.volumeUI.bar].forEach(sprite => {
                sprite.setScale(perfSettings.textureQuality);
                sprite.setAlpha(0.95);
            });
        }
        
        this.volumeUI.barBackground.setAlpha(0.5);
        this.volumeUI.box.setDepth(9000);
        this.volumeUI.barBackground.setDepth(9001);
        this.volumeUI.bar.setDepth(9002);
        
        setVolumeUI(this.volumeUI);
        setCurrentScene(this);

        // UI animation methods
        this.showVolumeUI = () => {
            if (this.hideTimeline) this.hideTimeline.stop();
            
            this.tweens.add({
                targets: [this.volumeUI.box, this.volumeUI.barBackground, this.volumeUI.bar],
                y: target => target === this.volumeUI.box ? showY : showY + barOffset,
                duration: ultraLowPerformanceMode ? 350 : 300,
                ease: 'Back.easeOut'
            });

            if (this.hideTimer) clearTimeout(this.hideTimer);
            this.hideTimer = setTimeout(() => this.hideVolumeUI(), 2000);
        };

        this.hideVolumeUI = () => {
            this.hideTimeline = this.tweens.add({
                targets: [this.volumeUI.box, this.volumeUI.barBackground, this.volumeUI.bar],
                y: target => target === this.volumeUI.box ? initialY : initialY + barOffset,
                duration: ultraLowPerformanceMode ? 350 : 300,
                ease: 'Back.easeIn'
            });
        };

        // Create optimized sounds
        this.volumeSounds = {
            up: this.sound.add('volUp'),
            down: this.sound.add('volDown'),
            max: this.sound.add('volMax')
        };
        
        if (ultraLowPerformanceMode) {
            Object.values(this.volumeSounds).forEach(sound => {
                sound.volume = perfSettings.audioVolume;
            });
        }
        
        setVolumeSounds(this.volumeSounds);

        // Version text with optimizations
        const versionText = this.add.text(10, this.scale.height - 50, 
            `v0.58 Indev:\nFriday Night Funkin': Genesis Engine${ultraLowPerformanceMode ? '\n(ULTRA LOW MODE)' : ''}`, 
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#FFFFFF',
                align: 'left',
                lineSpacing: 5,
                stroke: '#000000',
                strokeThickness: 2
            });

        if (ultraLowPerformanceMode) {
            versionText.setResolution(0.5);
            versionText.setAlpha(0.9);
        }
        
        versionText.setDepth(9000);
        versionText.setScrollFactor(0);
        this.scene.get('VolumeUIScene').scene.bringToTop();
    }
}

// Modified MainScene with optimizations
class OptimizedMainScene extends MainScene {
    constructor() {
        super();
    }

    preload() {
        super.preload();
        // Your MainScene specific loads here
    }

    create() {
        super.create();
        // Your MainScene specific logic here
    }
}

// Main game configuration
const gameConfig = {
    type: perfSettings.renderer,
    width: 1280,
    height: 720,
    parent: 'game-container',
    scene: [OptimizedMainScene, VolumeUIScene],
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true,
        fullscreenTarget: 'game-container',
    },
    render: {
        pixelArt: true,
        antialias: !ultraLowPerformanceMode,
        roundPixels: ultraLowPerformanceMode,
        powerPreference: ultraLowPerformanceMode ? 'low-power' : 'high-performance',
        batchSize: ultraLowPerformanceMode ? 512 : 2048,
        maxTextures: perfSettings.maxTextures
    },
    fps: {
        target: perfSettings.fps,
        forceSetTimeOut: ultraLowPerformanceMode,
        smoothStep: !ultraLowPerformanceMode,
        deltaHistory: ultraLowPerformanceMode ? 5 : 20
    },
    physics: {
        default: 'arcade',
        arcade: {
            fps: perfSettings.physicsFPS,
            gravity: { y: 0 },
            tileBias: ultraLowPerformanceMode ? 4 : 16,
            debug: !ultraLowPerformanceMode
        }
    },
    callbacks: {
        postBoot: game => {
            game.renderer.optimizeRedraw = true;
            
            if (game.renderer.type === Phaser.CANVAS) {
                const context = game.renderer.context;
                if (context) {
                    context.imageSmoothingEnabled = false;
                    context.mozImageSmoothingEnabled = false;
                    context.webkitImageSmoothingEnabled = false;
                    context.msImageSmoothingEnabled = false;
                    context.globalCompositeOperation = 'copy';
                }
            }
        }
    }
};

// Initialize the game
window.game = new Phaser.Game(gameConfig);

// Additional performance optimizations
game.events.on('ready', () => {
    window.crashHandler = new CrashHandler(game.scene.scenes[0]);
    
    if (ultraLowPerformanceMode) {
        // Disable unused features
        if (game.renderer.snapshot) game.renderer.snapshot = () => {};
        if (game.renderer.capture) game.renderer.capture = () => {};
        
        // Texture management alternative
        game.events.on('textureloaded', () => {
            const textures = game.textures.getTextureKeys();
            if (textures.length > perfSettings.maxTextures) {
                // Find and destroy unused textures
                textures.slice(0, textures.length - perfSettings.maxTextures).forEach(key => {
                    if (!game.textures.isInUse(key)) {
                        game.textures.remove(key);
                    }
                });
            }
        });
        
        // Reduce animation precision
        if (game.anims) {
            game.anims.frameRate = perfSettings.fps;
        }
        
        console.log('ULTRA LOW PERFORMANCE MODE ACTIVATED');
        console.log('Configuration:', perfSettings);
    }
});

initVolumeControl();

// Focus management
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        game.loop.sleep(); 
    } else {
        game.loop.wake(); 
    }
});

window.addEventListener("blur", () => game.loop.sleep());
window.addEventListener("focus", () => game.loop.wake());

// Fullscreen handling
const fullscreenBtn = document.getElementById('fullscreen-btn');
document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.style.display = document.fullscreenElement ? 'none' : 'block';
});