export class LoadingLol {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.bg = null;
        this.text = null;
        this.tipsTimer = null;
        
        this.tips = [
            "La Week 6 es el único stage en usar un shader global de estilo anime retro.",
            "Casi todos los escenarios originales se hicieron primero en Aseprite y luego se ajustaron en HaxeFlixel.",
            "Las semanas del juego base usan layouts muy simples: piso, fondo y props mínimos.",
            "La mayoría de fondos oficiales están compuestos por capas estáticas, no animadas.",
            "El escenario de la Week 1 fue el primero en crearse y es el más minimalista.",
            "La Week 3 usa objetos con parallax, pero con valores muy sutiles.",
            "“Consejo: coloca primero el fondo, ¡luego los detalles!”",
            "“Usa parallax con moderación: menos es más.”",
            "“Duplica elementos para ahorrar tiempo, no los rehagas.”",
            "“Los props pequeños pueden dar vida a un escenario.”",
            "“Evita saturar el stage: demasiados objetos pueden afectar el rendimiento.”",
            "“Organiza tus capas… tu yo del futuro te lo agradecerá.”",
            "“Prueba el escenario en gameplay antes de darlo por terminado.”",
            "“Usa animaciones cortas, mantienen el ritmo más fluido.”",
            "“Mantén la estética del juego: colores simples, sombras fuertes.”",
            "El stage de la Week 4 se inspira en conciertos de rock de los 80."
        ];

        this.create();
    }

    create() {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        this.bg = this.scene.add.image(0, 0, 'loading-bg');
        this.bg.setOrigin(0, 0);
        this.bg.setDisplaySize(width, height);
        this.bg.setScrollFactor(0);
        this.bg.setDepth(100000); 

        const style = {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            padding: { x: 10, y: 5 },
            wordWrap: { width: width - 40 }
        };

        this.text = this.scene.add.text(20, height - 50, '', style);
        this.text.setOrigin(0, 1);
        this.text.setScrollFactor(0);
        this.text.setDepth(100001);
        this.text.setStroke('#000000', 5);

        this.updateTip();
        
        this.tipsTimer = this.scene.time.addEvent({
            delay: 3000,
            callback: this.updateTip,
            callbackScope: this,
            loop: true
        });
    }

    updateTip() {
        if (!this.text || !this.text.active) return;
        const randomTip = this.tips[Math.floor(Math.random() * this.tips.length)];
        this.text.setText(`> ${randomTip}`);
    }

    destroy() {
        if (this.tipsTimer) {
            this.tipsTimer.remove();
            this.tipsTimer = null;
        }

        if (this.bg) {
            this.scene.tweens.add({
                targets: [this.bg, this.text],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    if (this.bg) this.bg.destroy();
                    if (this.text) this.text.destroy();
                    this.bg = null;
                    this.text = null;
                }
            });
        }
    }
}