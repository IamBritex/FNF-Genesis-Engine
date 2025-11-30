/**
 * source/funkin/ui/editors/chartEditor/components/ChartGrid.js
 */
import { NoteDirection } from '../../../../play/notes/NoteDirection.js';
import { Strumline } from '../../../../play/notes/Strumline.js';
import { NoteSpawner } from '../../../../play/notes/NoteSpawner.js';
import { SustainNote } from '../../../../play/notes/SustainNote.js';

export class ChartGrid {
    constructor(scene, conductor, dataManager, sessionId) {
        this.scene = scene;
        this.conductor = conductor;
        this.dataManager = dataManager;
        this.sessionId = sessionId;

        this.graphics = null;
        
        // --- CONFIGURACIÓN VISUAL ---
        this.gridSize = 90; 
        this.laneCount = 8; 
        this.gap = 100;
        this.visualOffset = -22; 
        
        this.sectionWidth = this.gridSize * 4;
        this.totalWidth = (this.sectionWidth * 2) + this.gap;
        this.gridHeight = 720;
        
        this.startX = (1280 - this.totalWidth) / 2;
        this.strumLimitY = 150; 

        // Colores
        this.colorLine = 0x999999; 
        this.colorBeat = 0xFFFFFF; 

        // Pools
        this.notePool = null;
        this.holdPool = null; 
        this.strumSprites = [];
        this.ghostNote = null;

        // Variables de Arrastre
        this.isDraggingNote = false;
        this.currentDragNoteData = null;
        this.dragStartY = 0;
        this.scrollSpeed = 1.0; 
    }

    getLaneX(laneIndex) {
        if (laneIndex < 4) {
            return this.startX + (laneIndex * this.gridSize);
        } else {
            return this.startX + this.sectionWidth + this.gap + ((laneIndex - 4) * this.gridSize);
        }
    }

    getLaneCenterX(laneIndex) {
        let laneStartX;
        if (laneIndex < 4) {
            laneStartX = this.startX + (laneIndex * this.gridSize);
        } else {
            laneStartX = this.startX + this.sectionWidth + this.gap + ((laneIndex - 4) * this.gridSize);
        }
        return laneStartX + (this.gridSize / 2);
    }

    create() {
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(1);

        this.createStrumlineReceptors();
        this.createGhostNote();

        // 1. Pool de Notas (Cabezas)
        // Depth 50: Para que estén siempre ENCIMA de los sustains
        this.notePool = this.scene.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: -1, 
            runChildUpdate: false
        });
        this.notePool.setDepth(50); 

        // 2. Pool de Sustains (Cuerpos y Colas)
        // Depth 40: Para que se generen en una CAPA ABAJO de las notas
        this.holdPool = this.scene.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: -1, 
            runChildUpdate: false
        });
        this.holdPool.setDepth(40); 

        // 3. Zona de input
        const totalWidth = (this.sectionWidth * 2) + this.gap;
        this.inputZone = this.scene.add.zone(this.startX - this.visualOffset, 0, totalWidth, 720).setOrigin(0,0);
        this.inputZone.setInteractive();
        
        this.inputZone.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);

        this.drawBackground();
    }

    createGhostNote() {
        const key = `${NoteSpawner.ATLAS_KEY}_${this.sessionId}`;
        if (this.scene.textures.exists(key)) {
            this.ghostNote = this.scene.add.sprite(0, 0, key);
            this.ghostNote.setVisible(false);
            this.ghostNote.setAlpha(0.6);
            this.ghostNote.setTint(0x888888);
            this.ghostNote.setDepth(200);
            this.ghostNote.setOrigin(0.5, 0.5);
        }
    }

    createStrumlineReceptors() {
        const strumY = 100;
        const key = `${Strumline.ATLAS_KEY}_${this.sessionId}`;
        if (!this.scene.textures.exists(key)) return;

        for (let i = 0; i < this.laneCount; i++) {
            const dirIndex = i % 4;
            const dirName = NoteDirection.getName(dirIndex);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            const frameName = `static${capDirName}0001`;

            const centerX = this.getLaneCenterX(i);

            const sprite = this.scene.add.sprite(centerX, strumY, key, frameName);
            sprite.setOrigin(0.5, 0.5); 
            const scale = this.gridSize / sprite.width; 
            sprite.setScale(scale); 
            sprite.setDepth(100); 
            
            // [MODIFICADO] Eliminada la reducción de opacidad (0.9 -> 1.0 por defecto)
            // sprite.setAlpha(0.9); 

            // Guardamos estado para no repetir animaciones innecesariamente
            sprite.isPlayingConfirm = false;

            this.strumSprites.push(sprite);
        }
    }

    drawBackground() {
        this.graphics.lineStyle(2, this.colorLine, 0.3);
        for (let i = 0; i < this.laneCount; i++) {
            const centerX = this.getLaneCenterX(i) - this.visualOffset;
            this.graphics.lineBetween(centerX, 0, centerX, 720);
        }
    }

    update(delta) {
        this.graphics.clear();
        this.drawBackground();
        this.updateGhostNote();
        this.handleDragLogic(delta);

        const songPos = this.conductor.songPosition;
        const PIXELS_PER_MS = this.scrollSpeed * 0.45; 

        // --- Beats (Líneas horizontales) ---
        const bpm = this.dataManager.chartData.bpm;
        const crochet = (60 / bpm) * 1000; 
        const stepCrochet = crochet / 4;   
        const startTime = songPos - (200 / PIXELS_PER_MS);
        const endTime = songPos + (1500 / PIXELS_PER_MS); 
        const startStep = Math.floor(startTime / stepCrochet);
        const endStep = Math.ceil(endTime / stepCrochet);

        for (let i = startStep; i <= endStep; i++) {
            const stepTime = i * stepCrochet;
            const y = 100 + (stepTime - songPos) * PIXELS_PER_MS; 

            if (i % 4 === 0) {
                this.graphics.lineStyle(2, this.colorBeat, 0.5);
                const enemyLeft = this.getLaneCenterX(0) - (this.gridSize/2) - this.visualOffset;
                const enemyRight = this.getLaneCenterX(3) + (this.gridSize/2) - this.visualOffset;
                this.graphics.lineBetween(enemyLeft, y, enemyRight, y);

                const playerLeft = this.getLaneCenterX(4) - (this.gridSize/2) - this.visualOffset;
                const playerRight = this.getLaneCenterX(7) + (this.gridSize/2) - this.visualOffset;
                this.graphics.lineBetween(playerLeft, y, playerRight, y);
            }
        }

        // Limpiar Pools
        this.notePool.getChildren().forEach(s => s.setVisible(false).setActive(false));
        this.holdPool.getChildren().forEach(s => s.setVisible(false).setActive(false));

        const sections = this.dataManager.getNotes();
        const noteAtlasKey = `${NoteSpawner.ATLAS_KEY}_${this.sessionId}`;
        const sustainAtlasKey = `${SustainNote.ATLAS_KEY}_${this.sessionId}`;
        
        const hasNoteTexture = this.scene.textures.exists(noteAtlasKey);
        const hasHoldTexture = this.scene.textures.exists(sustainAtlasKey);

        // [NUEVO] Array para rastrear qué carriles están "activos" (una nota pasa por ellos)
        const activeLanes = new Array(this.laneCount).fill(false);
        const RECEPTOR_Y = 100;
        const HIT_THRESHOLD = this.gridSize * 0.4; // Tolerancia visual para "golpear"

        sections.forEach(section => {
            section.sectionNotes.forEach(note => {
                const noteTime = note[0];
                const noteLane = note[1];
                const noteLength = note[2];
                
                const y = 100 + (noteTime - songPos) * PIXELS_PER_MS;
                const centerX = this.getLaneCenterX(noteLane) - this.visualOffset;
                
                // Calcular bounds visuales de la nota completa (cabeza + cola)
                const tailVisualLength = (noteLength > 0) ? noteLength * PIXELS_PER_MS : 0;
                
                // La nota empieza en 'y' (centro de cabeza) y termina en 'y + tailVisualLength' (final de cola)
                // Comprobamos si el Receptor (Y=100) está dentro de estos límites.
                // Usamos un pequeño threshold para la cabeza.
                const noteTop = y - HIT_THRESHOLD;
                const noteBottom = y + tailVisualLength + HIT_THRESHOLD;

                if (RECEPTOR_Y >= noteTop && RECEPTOR_Y <= noteBottom) {
                    if (noteLane >= 0 && noteLane < this.laneCount) {
                        activeLanes[noteLane] = true;
                    }
                }

                // Culling Ampliado
                if (y > -3000 && y < 1000) {
                    
                    // --- DIBUJAR CABEZA DE NOTA ---
                    if (hasNoteTexture) {
                        let noteSprite = this.notePool.get(); 
                        
                        if (noteSprite) {
                            const dirIndex = noteLane % 4;
                            const dirName = NoteDirection.getName(dirIndex);
                            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
                            const frameName = `note${capDirName}0001`;

                            noteSprite.setTexture(noteAtlasKey);
                            noteSprite.setFrame(frameName);
                            noteSprite.setPosition(centerX, y);
                            noteSprite.setOrigin(0.5, 0.5);
                            
                            // Escala estándar basada en el grid
                            const scale = (this.gridSize * 0.9) / noteSprite.width;
                            noteSprite.setScale(scale);
                            noteSprite.setDepth(50); // ENCIMA del sustain
                            noteSprite.setActive(true).setVisible(true);
                        }
                    }

                    // --- DIBUJAR SUSTAIN (WYSIWYG) ---
                    if (noteLength > 0 && hasHoldTexture) {
                        
                        // Solo procesar sustains visibles
                        if ((y < 800) && (y + tailVisualLength > -100)) {
                            const dirIndex = noteLane % 4;
                            const colorName = NoteDirection.getColorName(dirIndex);
                            const pieceFrame = `${colorName} hold piece0000`;
                            const endFrame = `${colorName} hold end0000`;

                            const targetWidth = this.gridSize * 0.35; 
                            
                            const tempPiece = this.scene.textures.get(sustainAtlasKey).get(pieceFrame);
                            const tempEnd = this.scene.textures.get(sustainAtlasKey).get(endFrame);
                            
                            const holdScaleX = targetWidth / tempPiece.width;
                            const holdScaleY = holdScaleX; 

                            const rawPieceHeight = tempPiece.height;
                            const scaledPieceHeight = rawPieceHeight * holdScaleY;
                            const scaledOverlap = SustainNote.PIECE_OVERLAP * holdScaleY; 
                            
                            const effectiveHeight = scaledPieceHeight + scaledOverlap;
                            const endHeight = tempEnd.height * holdScaleY;

                            let bodyLength = tailVisualLength - (endHeight * 0.5); 
                            if (bodyLength < 0) bodyLength = 0;

                            const numPieces = Math.ceil(bodyLength / effectiveHeight);

                            const startOffsetY = 0; 

                            // --- LOOP DE PIEZAS (CUERPO) ---
                            for (let i = 0; i < numPieces; i++) {
                                const segmentRelativeY = startOffsetY + (i * effectiveHeight);
                                const segmentAbsY = y + segmentRelativeY;

                                if (segmentAbsY < -50 || segmentAbsY > 770) continue;

                                let bodySprite = this.holdPool.get(); 
                                if (bodySprite) {
                                    bodySprite.setTexture(sustainAtlasKey);
                                    bodySprite.setFrame(pieceFrame);
                                    bodySprite.setOrigin(0.5, 0); 
                                    
                                    bodySprite.setPosition(centerX, segmentAbsY);
                                    bodySprite.setScale(holdScaleX, holdScaleY);
                                    
                                    bodySprite.setDepth(40); // DEBAJO de la nota
                                    bodySprite.setActive(true).setVisible(true);
                                }
                            }

                            // --- PIEZA FINAL (COLA) ---
                            const endY = y + startOffsetY + bodyLength;
                            
                            if (endY > -50 && endY < 770) {
                                let endSprite = this.holdPool.get();
                                if (endSprite) {
                                    endSprite.setTexture(sustainAtlasKey);
                                    endSprite.setFrame(endFrame);
                                    endSprite.setOrigin(0.5, 0);
                                    endSprite.setPosition(centerX, endY);
                                    endSprite.setScale(holdScaleX, holdScaleY);
                                    endSprite.setDepth(40); // DEBAJO de la nota
                                    endSprite.setActive(true).setVisible(true);
                                }
                            }
                        }
                    } 
                    // Fallback
                    else if (noteLength > 0 && !hasHoldTexture) {
                        const tailLength = noteLength * PIXELS_PER_MS;
                        const dirIndex = noteLane % 4;
                        let color = NoteDirection.getColor(dirIndex);
                        if (typeof color === 'string') color = parseInt(color.replace('#', '0x'), 16);
                        this.graphics.fillStyle(color, 0.6);
                        const tailWidth = this.gridSize * 0.35; 
                        const tailX = centerX - (tailWidth / 2);
                        this.graphics.fillRect(tailX, y, tailWidth, tailLength);
                    }
                }
            });
        });

        // [NUEVO] Actualizar estado visual de los receptores (WYSIWYG)
        this.updateReceptorsVisuals(activeLanes);
    }

    // [NUEVO] Método para gestionar la animación de los receptores
    updateReceptorsVisuals(activeLanes) {
        for (let i = 0; i < this.laneCount; i++) {
            const sprite = this.strumSprites[i];
            if (!sprite) continue;

            const dirIndex = i % 4;
            const isActive = activeLanes[i];

            // Si el estado cambió, actualizamos la animación
            if (isActive) {
                if (!sprite.isPlayingConfirm) {
                    const dirName = NoteDirection.getName(dirIndex);
                    const suffix = this.sessionId ? `_${this.sessionId}` : '';
                    const confirmAnimKey = `confirm_${dirName}${suffix}`;

                    if (this.scene.anims.exists(confirmAnimKey)) {
                        sprite.play(confirmAnimKey);
                    } else {
                        // Fallback por si no hay animación
                        sprite.setAlpha(1); 
                    }
                    sprite.isPlayingConfirm = true;
                }
            } else {
                if (sprite.isPlayingConfirm) {
                    const dirName = NoteDirection.getName(dirIndex);
                    const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
                    const staticFrame = `static${capDirName}0001`;
                    
                    // Detener animación y poner frame estático
                    sprite.stop();
                    sprite.setFrame(staticFrame);
                    
                    // Resetear posición si la animación confirm la movió (offsets)
                    // (Los offsets están en Strumline.OFFSETS.static)
                    sprite.x = this.getLaneCenterX(i);
                    sprite.y = 100; // strumY original

                    sprite.isPlayingConfirm = false;
                }
            }
        }
    }

    handleDragLogic(delta) {
        if (!this.isDraggingNote || !this.currentDragNoteData) return;

        const pointer = this.scene.input.activePointer;
        const PIXELS_PER_MS = this.scrollSpeed * 0.45;

        // Auto-Scroll
        const scrollThreshold = 100; 
        const scrollSpeedMs = 2 * delta; 

        if (pointer.y > 720 - scrollThreshold) {
            this.conductor.songPosition += scrollSpeedMs;
        } else if (pointer.y < this.strumLimitY + scrollThreshold) {
            this.conductor.songPosition = Math.max(0, this.conductor.songPosition - scrollSpeedMs);
        }

        const mouseTime = ((pointer.y - 100) / PIXELS_PER_MS) + this.conductor.songPosition;
        const noteStartTime = this.currentDragNoteData[0];
        let newLength = mouseTime - noteStartTime;
        
        if (newLength < 0) newLength = 0;
        this.currentDragNoteData[2] = newLength;
    }

    updateGhostNote() {
        if (!this.ghostNote) return;
        const pointer = this.scene.input.activePointer;
        
        if (pointer.y < this.strumLimitY || (!pointer.isDown && (pointer.x < 0 || pointer.x > 1280 || pointer.y > 720))) {
            this.ghostNote.setVisible(false);
            return;
        }

        const hoverX = pointer.x;
        const hoverY = pointer.y;
        const adjustedHoverX = hoverX + this.visualOffset;

        let lane = -1;
        if (adjustedHoverX >= this.startX && adjustedHoverX < (this.startX + this.sectionWidth)) {
            const localX = adjustedHoverX - this.startX;
            lane = Math.floor(localX / this.gridSize);
        } else {
            const playerStart = this.startX + this.sectionWidth + this.gap;
            if (adjustedHoverX >= playerStart && adjustedHoverX < (playerStart + this.sectionWidth)) {
                const localX = adjustedHoverX - playerStart;
                lane = 4 + Math.floor(localX / this.gridSize);
            }
        }

        if (lane !== -1) {
            const centerX = this.getLaneCenterX(lane) - this.visualOffset;
            this.ghostNote.setPosition(centerX, hoverY);
            
            const dirIndex = lane % 4;
            const dirName = NoteDirection.getName(dirIndex);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            const frameName = `note${capDirName}0001`;
            
            this.ghostNote.setFrame(frameName);
            const scale = (this.gridSize * 0.9) / this.ghostNote.width;
            this.ghostNote.setScale(scale);
            this.ghostNote.setVisible(true);
        } else {
            this.ghostNote.setVisible(false);
        }
    }

    updateScroll(newTime) {
        this.update(0); 
    }

    onPointerDown(pointer) {
        if (pointer.y < this.strumLimitY) return;

        const clickX = pointer.x;
        const clickY = pointer.y;
        const adjustedClickX = clickX + this.visualOffset;
        
        let lane = -1;
        if (adjustedClickX >= this.startX && adjustedClickX < (this.startX + this.sectionWidth)) {
            const localX = adjustedClickX - this.startX;
            lane = Math.floor(localX / this.gridSize);
        } else {
            const playerStart = this.startX + this.sectionWidth + this.gap;
            if (adjustedClickX >= playerStart && adjustedClickX < (playerStart + this.sectionWidth)) {
                const localX = adjustedClickX - playerStart;
                lane = 4 + Math.floor(localX / this.gridSize);
            }
        }

        if (lane !== -1) {
            const PIXELS_PER_MS = this.scrollSpeed * 0.45;
            const rawTime = ((clickY - 100) / PIXELS_PER_MS) + this.conductor.songPosition;
            const finalTime = Math.max(0, rawTime);

            const createdNote = this.dataManager.addNote(finalTime, lane);
            if (createdNote) {
                this.isDraggingNote = true;
                this.currentDragNoteData = createdNote;
                this.scene.sound.play('clickDown');
            }
        }
    }

    onPointerMove(pointer) {
    }

    onPointerUp(pointer) {
        if (this.isDraggingNote) {
            this.isDraggingNote = false;
            this.currentDragNoteData = null;
        }
    }
}