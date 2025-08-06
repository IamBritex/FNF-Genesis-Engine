export class DetailInfo {
    static instance = null;
    static mode = 0; // 0: hidden, 1: basic info, 2: detailed info

    static init(scene) {
        if (!DetailInfo.instance) {
            DetailInfo.instance = new DetailInfo(scene);
        }
        return DetailInfo.instance;
    }

    constructor(scene) {
        this.scene = scene;
        this.visible = false;
        this.startTime = performance.now();
        this.lastSceneKey = scene.scene.key;
        this.mouseX = 0;
        this.mouseY = 0;
        this.pointerDown = false;

        // Configuración visual
        this.maxWidth = 420; // Límite de ancho para los textos

        // Arrays para textos y fondos
        this.fpsLines = [];
        this.fpsBgRects = [];
        this.clientLines = [];
        this.clientBgRects = [];

        // Crear grupos de contenedores para los textos y fondos
        this.fpsGroup = scene.add.container(10, 10).setDepth(99999).setVisible(false);
        this.clientGroup = scene.add.container(0, 10).setDepth(99999).setVisible(false);

        // Actualiza posición si cambia el tamaño del canvas
        scene.scale.on('resize', (gameSize) => {
            this.updateClientGroupPosition(gameSize.width);
        });
        this.updateClientGroupPosition(scene.scale.width);

        scene.input && scene.input.on('pointermove', pointer => {
            this.mouseX = Math.round(pointer.x);
            this.mouseY = Math.round(pointer.y);
        });

        scene.input && scene.input.on('pointerdown', () => {
            this.pointerDown = true;
        });
        scene.input && scene.input.on('pointerup', () => {
            this.pointerDown = false;
        });

        scene.events.on('update', this.update, this);

        // Listen for F3 key globally and prevent default browser action
        if (!window._detailInfoF3Listener) {
            window._detailInfoF3Listener = true;
            window.addEventListener('keydown', (e) => {
                if (e.code === 'F3') {
                    e.preventDefault();
                    DetailInfo.nextMode();
                }
            }, { capture: true });
        }

        // Listen for scene switch to update lastSceneKey
        if (!window._detailInfoSceneListener) {
            window._detailInfoSceneListener = true;
            const origStart = Phaser.Scenes.SceneManager.prototype.start;
            Phaser.Scenes.SceneManager.prototype.start = function(key, ...args) {
                if (DetailInfo.instance) {
                    DetailInfo.instance.lastSceneKey = key;
                }
                return origStart.call(this, key, ...args);
            };
        }
    }

    updateClientGroupPosition(width) {
        if (this.clientGroup) {
            this.clientGroup.x = width - 10;
        }
    }

    static nextMode() {
        DetailInfo.mode = (DetailInfo.mode + 1) % 3;
        if (DetailInfo.instance) {
            DetailInfo.instance.visible = DetailInfo.mode !== 0;
            DetailInfo.instance.fpsGroup.setVisible(DetailInfo.instance.visible);
            DetailInfo.instance.clientGroup.setVisible(DetailInfo.mode === 2 && DetailInfo.instance.visible);
        }
    }

    formatElapsed(seconds) {
        if (seconds < 60) {
            return `${seconds.toFixed(1)}s`;
        } else if (seconds < 3600) {
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}m ${sec}s`;
        } else {
            const hr = Math.floor(seconds / 3600);
            const min = Math.floor((seconds % 3600) / 60);
            return `${hr}h ${min}m`;
        }
    }

    clearLines(lines, bgRects) {
        lines.forEach(t => t.destroy());
        bgRects.forEach(r => r.destroy());
        lines.length = 0;
        bgRects.length = 0;
    }

    drawLines(linesArr, bgArr, group, lines, align = 'left', showBackground = true) {
        this.clearLines(linesArr, bgArr);
        let y = 0;
        const margin = 10;

        for (let i = 0; i < lines.length; i++) {
            // Texto
            const textObj = this.scene.add.text(
                align === 'left' ? margin : 0,
                y,
                lines[i],
                {
                    fontFamily: 'FiraCode',
                    fontSize: '15px',
                    color: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 2,
                    align: align === 'left' ? 'left' : 'right',
                    wordWrap: { width: this.maxWidth, useAdvancedWrap: true }
                }
            )
            .setScrollFactor(0)
            .setDepth(99999)
            .setOrigin(align === 'left' ? 0 : 1, 0);

            group.add(textObj);
            linesArr.push(textObj);

            y += textObj.height + 2;
        }
    }

    update() {
        if (!this.visible) {
            this.fpsGroup.setVisible(false);
            this.clientGroup.setVisible(false);
            return;
        }
        const game = this.scene.sys.game;
        const fps = Math.round(game.loop.actualFps);
        let mem = 'N/A';
        if (performance && performance.memory) {
            const used = performance.memory.usedJSHeapSize / 1048576;
            const total = performance.memory.totalJSHeapSize / 1048576;
            mem = `${used.toFixed(1)} / ${total.toFixed(1)} MB`;
        }

        if (DetailInfo.mode === 1) {
            this.fpsGroup.setVisible(true);
            this.clientGroup.setVisible(false);
            this.drawLines(
                this.fpsLines, 
                this.fpsBgRects, 
                this.fpsGroup,
                [`FPS: ${fps}`, `Mem: ${mem}`], 
                'left',
                false // No mostrar fondos en modo básico
            );
        } else if (DetailInfo.mode === 2) {
            // Loaded files
            let loadedFiles = 0;
            try {
                loadedFiles = this.scene.load.totalComplete || 0;
            } catch {}
            // Elapsed time
            const elapsedSec = (performance.now() - this.startTime) / 1000;
            const elapsed = this.formatElapsed(elapsedSec);
            // Focus
            const focus = document.hasFocus() ? "Yes" : "No";
            // Mouse
            const mouse = `X: ${this.mouseX} Y: ${this.mouseY}`;
            // Scene info
            const sceneKey = this.scene.scene.key;
            const lastScene = this.lastSceneKey || sceneKey;
            // Render type
            let renderType = "Unknown";
            if (game.renderer) {
                renderType = game.renderer.type === 2 ? "WebGL" : (game.renderer.type === 1 ? "Canvas" : "Unknown");
            }
            // Game size
            const gameSize = `${game.scale.width}x${game.scale.height}`;
            // Pointer down
            const pointerDown = this.pointerDown ? "Yes" : "No";

            // FPS/Info izquierda
            this.fpsGroup.setVisible(true);
            this.drawLines(
                this.fpsLines, 
                this.fpsBgRects, 
                this.fpsGroup,
                [
                    `FPS: ${fps}`,
                    `Mem: ${mem}`,
                    `Render: ${renderType}`,
                    `Game size: ${gameSize}`,
                    `Current scene: ${sceneKey}`,
                    `Last scene: ${lastScene}`,
                    `Focus: ${focus}`,
                    `Loaded files: ${loadedFiles}`,
                    `Active time: ${elapsed}`,
                    `Pointer Down: ${pointerDown}`,
                    `Mouse: ${mouse}`
                ],
                'left',
                true
            );

            // Client info derecha (más información)
            this.clientGroup.setVisible(true);
            this.drawLines(
                this.clientLines, 
                this.clientBgRects, 
                this.clientGroup,
                [
                    `Client:`,
                    `User Agent: ${navigator.userAgent}`,
                    `Cookies enabled: ${navigator.cookieEnabled ? "Yes" : "No"}`,
                    `Platform: ${navigator.platform || "Unknown"}`,
                    `Language: ${navigator.language || "Unknown"}`,
                    `Online: ${navigator.onLine ? "Yes" : "No"}`,
                    `Screen: ${window.screen.width}x${window.screen.height}`,
                    `Device Memory: ${navigator.deviceMemory ? navigator.deviceMemory + " GB" : "Unknown"}`
                ],
                'right',
                true
            );
        }
    }
}