import { HealthBar } from '../../../../play/components/healthBar.js';
import { HealthIcon } from '../../../../play/components/healthIcon.js';
import { Conductor } from '../../../../play/Conductor.js';

export class HealthBarPreview {
    /**
     * @param {Phaser.Scene} scene
     * @param {string} sessionId
     */
    constructor(scene, sessionId) {
        this.scene = scene;
        this.sessionId = sessionId;
        
        this.healthBar = null;
        this.conductor = null;
        this.bpm = 100;
    }

    create() {
        this.conductor = new Conductor(this.bpm);
        
        const mockChartData = {
            player: 'face',
            enemy: 'dad',
            bpm: this.bpm
        };

        this.healthBar = new HealthBar(this.scene, mockChartData, this.conductor, this.sessionId);

        this.healthBar.init().then(() => {
            if (this.healthBar.container) {
                const centerX = this.scene.scale.width / 2;
                const bottomY = this.scene.scale.height - 50;

                this.healthBar.container.setPosition(centerX, bottomY);
                this.healthBar.container.setScale(0.8);
                this.healthBar.container.setVisible(true);
                
                if (this.scene.setAsHUDElement) {
                    this.scene.setAsHUDElement(this.healthBar.container);
                }
                
                this.healthBar.container.setScrollFactor(0);
                this.healthBar.setHealth(2.0);

                if (this.healthBar.enemyIcon && this.healthBar.enemyIcon.sprite) {
                    this.healthBar.enemyIcon.sprite.setVisible(false);
                    this.healthBar.enemyIcon.sprite.setAlpha(0);
                }
                
                if (this.healthBar.playerIcon) {
                    this.healthBar.playerIcon.updateIconState(false);
                }
                
                this.healthBar.updateBar();
            }
        });

        this.scene.events.on('healthColorsChanged', (color) => this.updateVisuals(color, null));
        this.scene.events.on('healthIconChanged', (iconInfo) => this.updateVisuals(null, iconInfo));
        this.scene.events.on('characterLoaded', (jsonData) => this.onCharacterLoaded(jsonData));
    }

    update(delta) {
        if (this.healthBar && this.conductor) {
            this.conductor.update(delta);
            this.healthBar.updateBeatBounce(this.conductor.songPosition, delta);

            if (this.healthBar.health < 2.0) {
                this.healthBar.setHealth(2.0);
            }
            
            if (this.healthBar.enemyIcon && this.healthBar.enemyIcon.sprite && this.healthBar.enemyIcon.sprite.visible) {
                this.healthBar.enemyIcon.sprite.setVisible(false);
            }
        }
    }

    onCharacterLoaded(jsonData) {
        if (!jsonData) return;
        
        let hexColor = null;
        if (jsonData.healthbar_colors) {
            hexColor = Phaser.Display.Color.GetColor(
                jsonData.healthbar_colors[0],
                jsonData.healthbar_colors[1],
                jsonData.healthbar_colors[2]
            );
        }

        const iconName = jsonData.healthicon || 'face';
        this.updateVisuals(hexColor, iconName);
    }

    updateVisuals(color, iconInfo) {
        if (!this.healthBar) return;

        if (color !== null) {
            this.healthBar.config.colors.player = color;
        }

        if (iconInfo) {
            let iconName, iconId;
            if (typeof iconInfo === 'string') {
                iconName = iconInfo;
            } else {
                iconName = iconInfo.name;
                iconId = iconInfo.id;
            }

            // Si no se pasó ID, intentar buscarlo en la cache de la escena
            if (!iconId && this.scene.iconCacheIds) {
                iconId = this.scene.iconCacheIds[iconName];
            }

            this.healthBar.playerIconName = iconName;
            
            // [MODIFICADO] Construir key con ID si existe
            const iconKey = `icon-${iconName}_${this.sessionId}${iconId ? '_' + iconId : ''}`;
            
            if (!this.scene.textures.exists(iconKey)) {
                this.scene.load.image(iconKey, `public/images/characters/icons/${iconName}.png`);
                this.scene.load.once(`filecomplete-image-${iconKey}`, () => {
                    this._refreshIcon(iconName, iconKey, iconId);
                });
                this.scene.load.start();
            } else {
                this._refreshIcon(iconName, iconKey, iconId);
            }
        } else {
            this.healthBar.updateBar();
        }
    }

    _refreshIcon(iconName, iconKey, iconId) {
        if (this.healthBar && this.healthBar.playerIcon) {
            this.healthBar.playerIcon.destroy();

            const texture = this.scene.textures.get(iconKey);
            let isPixel = false;
            if (texture && texture.source[0] && texture.source[0].width < 150) {
                isPixel = true;
            }

            // [MODIFICADO] Crear HealthIcon con session ID específico (para incluir el uniqueId)
            // El constructor de HealthIcon usa: 'icon-' + name + '_' + sessionId
            // Si pasamos sessionId = "session_123", busca "icon-name_session_123"
            const specificSessionId = this.sessionId + (iconId ? `_${iconId}` : '');
            
            const newIcon = new HealthIcon(this.scene, iconName, true, isPixel, specificSessionId);
            
            newIcon.bpm = this.bpm;

            const barWidth = this.healthBar.backgroundBar.width * this.healthBar.config.scale;
            const posX = barWidth / 4; 

            newIcon.create(posX, 0);
            newIcon.setDepth(101);

            this.healthBar.container.add(newIcon.sprite);
            this.healthBar.playerIcon = newIcon;

            newIcon.updateIconState(false);
        }
        
        this.healthBar.setHealth(2.0);
        this.healthBar.updateBar();
    }

    destroy() {
        if (this.healthBar) {
            this.healthBar.destroy();
            this.healthBar = null;
        }
        if (this.conductor) {
            this.conductor.stop();
            this.conductor = null;
        }
        this.scene.events.off('healthColorsChanged');
        this.scene.events.off('healthIconChanged');
        this.scene.events.off('characterLoaded');
    }
}