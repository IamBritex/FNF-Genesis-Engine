/**
 * source/funkin/ui/editors/chartEditor/components/ChartGrid.js
 */
import { NoteDirection } from '../../../../play/notes/NoteDirection.js';
import { Strumline } from '../../../../play/notes/Strumline.js';
import { NoteSpawner } from '../../../../play/notes/NoteSpawner.js';
import { SustainNote } from '../../../../play/notes/SustainNote.js';

export class ChartGrid {
    constructor(scene, conductor, dataManager, sessionId, noteSkin) {
        this.scene = scene;
        this.conductor = conductor;
        this.dataManager = dataManager;
        this.sessionId = sessionId;
        this.noteSkin = noteSkin;

        this.graphics = null;
        
        // --- VISUAL CONFIG ---
        this.gridSize = 90; 
        this.laneCount = 8; 
        this.gap = 100;
        
        // Offset for Grid Lines (Left)
        this.visualOffset = -7; 
        
        // Offset for Sustains (Right)
        this.sustainOffsetX = -5;

        this.sectionWidth = this.gridSize * 4;
        this.totalWidth = (this.sectionWidth * 2) + this.gap;
        this.gridHeight = 720;
        
        this.startX = (1280 - this.totalWidth) / 2;
        
        this.strumLimitY = 150; 

        this.colorLine = 0x999999; 
        this.colorBeat = 0xFFFFFF; 

        this.notePool = null;
        this.holdPool = null; 
        this.strumSprites = [];
        this.ghostNote = null;

        // Drag Variables
        this.isDragging = false;
        this.dragMode = 'none'; 
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

        if (this.noteSkin) {
            Strumline.createAnimations(this.scene, this.noteSkin.getTextureKey('strumline'));
        }

        this.createStrumlineReceptors();
        this.createGhostNote();

        this.notePool = this.scene.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: -1, 
            runChildUpdate: false
        });
        this.notePool.setDepth(110); 

        this.holdPool = this.scene.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: -1, 
            runChildUpdate: false
        });
        this.holdPool.setDepth(105); 

        const totalWidth = (this.sectionWidth * 2) + this.gap;
        this.inputZone = this.scene.add.zone(this.startX, 0, totalWidth, 720).setOrigin(0,0);
        this.inputZone.setInteractive();
        
        this.inputZone.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);

        this.drawBackground();
    }

    createGhostNote() {
        const key = this.noteSkin ? this.noteSkin.getTextureKey('notes') : 'notes';
        if (this.scene.textures.exists(key)) {
            this.ghostNote = this.scene.add.sprite(0, 0, key);
            this.ghostNote.setVisible(false);
            this.ghostNote.setAlpha(0.6);
            this.ghostNote.setTint(0x888888);
            this.ghostNote.setDepth(200);
            this.ghostNote.setOrigin(0, 0); 
        }
    }

    createStrumlineReceptors() {
        const strumY = 100;
        const key = this.noteSkin ? this.noteSkin.getTextureKey('strumline') : 'noteStrumline';
        const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
        
        const staticOffset = (skinData && skinData.strumline && skinData.strumline.offsets && skinData.strumline.offsets.static) 
                             ? skinData.strumline.offsets.static : { x: 0, y: 0 };

        if (!this.scene.textures.exists(key)) return;

        for (let i = 0; i < this.laneCount; i++) {
            const dirIndex = i % 4;
            const dirName = NoteDirection.getName(dirIndex);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            
            const possibleFrames = [`static${capDirName}0001`, `arrow${NoteDirection.getNameUpper(dirIndex)}`, `${dirName}0000`];
            const tex = this.scene.textures.get(key);
            const frameName = possibleFrames.find(f => tex.has(f));

            if (!frameName) continue;

            const leftX = this.getLaneX(i);
            const posX = leftX + staticOffset.x;

            const sprite = this.scene.add.sprite(posX, strumY + staticOffset.y, key, frameName);
            sprite.setOrigin(0, 0); 
            
            const scale = this.gridSize / (sprite.width || 150); 
            sprite.setScale(scale); 
            
            sprite.setDepth(100); 

            sprite.isPlayingConfirm = false;
            sprite.baseY = strumY; 
            sprite.baseX = posX;

            this.strumSprites.push(sprite);
        }
    }

    drawBackground() {
        const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
        const noteOffsets = (skinData && skinData.notes && skinData.notes.offsets) ? skinData.notes.offsets : { x: 0, y: 0 };
        const gridXOffset = noteOffsets.x; 

        this.graphics.lineStyle(2, this.colorLine, 0.3);
        
        for (let i = 0; i < this.laneCount; i++) {
            const centerX = this.getLaneCenterX(i);
            const visualLineX = centerX + gridXOffset + this.visualOffset;
            this.graphics.lineBetween(visualLineX, 0, visualLineX, 720);
        }
    }

    update(delta) {
        this.graphics.clear();
        this.drawBackground();
        this.updateGhostNote();
        this.handleDragLogic(delta);

        const songPos = this.conductor.songPosition;
        const PIXELS_PER_MS = this.scrollSpeed * 0.45; 

        const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
        const noteOffsets = (skinData && skinData.notes && skinData.notes.offsets) ? skinData.notes.offsets : { x: 0, y: 0 };
        const gridXOffset = noteOffsets.x; 
        const sustainOffsets = (skinData && skinData.sustain && skinData.sustain.offsets) ? skinData.sustain.offsets : { pieceHeight: 44, pieceOverlap: -40 };

        const strumOffset = (skinData && skinData.strumline && skinData.strumline.offsets && skinData.strumline.offsets.static) 
                             ? skinData.strumline.offsets.static : { x: 0, y: 0 };

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
                const enemyLeft = this.getLaneX(0) + gridXOffset + this.visualOffset;
                const enemyRight = this.getLaneX(3) + this.gridSize + gridXOffset + this.visualOffset;
                this.graphics.lineBetween(enemyLeft, y, enemyRight, y);

                const playerLeft = this.getLaneX(4) + gridXOffset + this.visualOffset;
                const playerRight = this.getLaneX(7) + this.gridSize + gridXOffset + this.visualOffset;
                this.graphics.lineBetween(playerLeft, y, playerRight, y);
            }
        }

        this.notePool.getChildren().forEach(s => s.setVisible(false).setActive(false));
        this.holdPool.getChildren().forEach(s => s.setVisible(false).setActive(false));

        const sections = this.dataManager.getNotes();
        const noteAtlasKey = this.noteSkin ? this.noteSkin.getTextureKey('notes') : 'notes';
        const sustainAtlasKey = this.noteSkin ? this.noteSkin.getTextureKey('sustain') : 'NOTE_hold_assets';
        
        const hasNoteTexture = this.scene.textures.exists(noteAtlasKey);
        const hasHoldTexture = this.scene.textures.exists(sustainAtlasKey);

        const activeLanes = new Array(this.laneCount).fill(false);
        const HIT_THRESHOLD = this.gridSize * 0.4; 
        
        const RECEPTOR_VISUAL_Y = 100 + strumOffset.y;

        sections.forEach(section => {
            section.sectionNotes.forEach(note => {
                const noteTime = note[0];
                const noteLane = note[1];
                const noteLength = note[2];
                
                const baseY = 100 + (noteTime - songPos) * PIXELS_PER_MS;
                const visualY = baseY + noteOffsets.y; 
                
                const leftX = this.getLaneX(noteLane);
                const centerX = this.getLaneCenterX(noteLane);
                
                const visualX = leftX + noteOffsets.x;
                const sustainX = centerX + noteOffsets.x + this.sustainOffsetX;
                
                const tailVisualLength = (noteLength > 0) ? noteLength * PIXELS_PER_MS : 0;
                
                const noteTop = visualY - HIT_THRESHOLD;
                const noteBottom = visualY + tailVisualLength + HIT_THRESHOLD;

                if (RECEPTOR_VISUAL_Y >= noteTop && RECEPTOR_VISUAL_Y <= noteBottom) {
                    if (noteLane >= 0 && noteLane < this.laneCount) {
                        activeLanes[noteLane] = true;
                    }
                }

                if (visualY > -3000 && visualY < 1000) {
                    
                    if (hasNoteTexture) {
                        const isNotePassed = visualY < RECEPTOR_VISUAL_Y;
                        const isBeingDragged = this.isDragging && this.currentDragNoteData === note;

                        if (!isNotePassed || isBeingDragged) {
                            let noteSprite = this.notePool.get(); 
                            if (noteSprite) {
                                const dirIndex = noteLane % 4;
                                const dirName = NoteDirection.getName(dirIndex);
                                const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
                                const frameName = `note${capDirName}0001`;

                                noteSprite.setTexture(noteAtlasKey);
                                noteSprite.setFrame(frameName);
                                noteSprite.setPosition(visualX, visualY);
                                noteSprite.setOrigin(0, 0); 
                                
                                const scale = (this.gridSize * 0.9) / noteSprite.width;
                                noteSprite.setScale(scale);
                                
                                if (isBeingDragged) {
                                    noteSprite.setAlpha(0.7);
                                } else {
                                    noteSprite.setAlpha(1);
                                }

                                noteSprite.setDepth(110); 
                                noteSprite.setActive(true).setVisible(true);

                                if (this.scene.uiCamera) {
                                    this.scene.uiCamera.ignore(noteSprite);
                                }
                            }
                        }
                    }

                    if (noteLength > 0 && hasHoldTexture) {
                        if ((visualY < 800) && (visualY + tailVisualLength > -100)) {
                            const dirIndex = noteLane % 4;
                            const colorName = NoteDirection.getColorName(dirIndex);
                            const pieceFrame = `${colorName} hold piece0000`;
                            const endFrame = `${colorName} hold end0000`;

                            const tex = this.scene.textures.get(sustainAtlasKey);
                            const tempPiece = tex.get(pieceFrame);
                            const tempEnd = tex.get(endFrame);

                            if (tempPiece && tempEnd) {
                                const targetWidth = this.gridSize * 0.35; 
                                const holdScaleX = targetWidth / tempPiece.width;
                                const holdScaleY = holdScaleX; 
                                const rawPieceHeight = tempPiece.height;
                                const scaledPieceHeight = rawPieceHeight * holdScaleY;
                                const overlapValue = sustainOffsets.pieceOverlap || -40;
                                const scaledOverlap = overlapValue * holdScaleY; 
                                const effectiveHeight = scaledPieceHeight + scaledOverlap;
                                const endHeight = tempEnd.height * holdScaleY;

                                let bodyLength = tailVisualLength - (endHeight * 0.5); 
                                if (bodyLength < 0) bodyLength = 0;

                                const safeHeight = Math.max(1, effectiveHeight);
                                const numPieces = Math.ceil(bodyLength / safeHeight);
                                
                                const startOffsetY = 0; 
                                const noteHalfWidth = (this.gridSize * 0.9) / 2;

                                for (let i = 0; i < numPieces; i++) {
                                    const segmentRelativeY = startOffsetY + (i * safeHeight);
                                    const segmentAbsY = visualY + segmentRelativeY;
                                    const correctedSegmentY = segmentAbsY + noteHalfWidth; 

                                    if (correctedSegmentY < -50 || correctedSegmentY > 770) continue;
                                    if (correctedSegmentY < RECEPTOR_VISUAL_Y) continue;

                                    let bodySprite = this.holdPool.get(); 
                                    if (bodySprite) {
                                        bodySprite.setTexture(sustainAtlasKey);
                                        bodySprite.setFrame(pieceFrame);
                                        bodySprite.setOrigin(0.5, 0); 
                                        
                                        bodySprite.setPosition(sustainX, correctedSegmentY);
                                        
                                        bodySprite.setScale(holdScaleX, holdScaleY);
                                        bodySprite.setDepth(105);
                                        bodySprite.setActive(true).setVisible(true);

                                        if (this.scene.uiCamera) {
                                            this.scene.uiCamera.ignore(bodySprite);
                                        }
                                    }
                                }

                                const endY = visualY + startOffsetY + bodyLength + noteHalfWidth;
                                const isTailPassed = endY < RECEPTOR_VISUAL_Y;

                                if (!isTailPassed && endY > -50 && endY < 770) {
                                    let endSprite = this.holdPool.get();
                                    if (endSprite) {
                                        endSprite.setTexture(sustainAtlasKey);
                                        endSprite.setFrame(endFrame);
                                        endSprite.setOrigin(0.5, 0);
                                        endSprite.setPosition(sustainX, endY);
                                        endSprite.setScale(holdScaleX, holdScaleY);
                                        endSprite.setDepth(105);
                                        endSprite.setActive(true).setVisible(true);

                                        if (this.scene.uiCamera) {
                                            this.scene.uiCamera.ignore(endSprite);
                                        }
                                    }
                                }
                            }
                        }
                    } 
                    else if (noteLength > 0 && !hasHoldTexture) {
                        const tailLength = noteLength * PIXELS_PER_MS;
                        const dirIndex = noteLane % 4;
                        let color = NoteDirection.getColor(dirIndex);
                        if (typeof color === 'string') color = parseInt(color.replace('#', '0x'), 16);
                        this.graphics.fillStyle(color, 0.6);
                        const tailWidth = this.gridSize * 0.35; 
                        const tailX = sustainX - (tailWidth / 2);
                        this.graphics.fillRect(tailX, visualY, tailWidth, tailLength);
                    }
                }
            });
        });

        this.updateReceptorsVisuals(activeLanes);
    }

    updateReceptorsVisuals(activeLanes) {
        const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
        const confirmOffset = (skinData && skinData.strumline && skinData.strumline.offsets && skinData.strumline.offsets.confirm)
                              ? skinData.strumline.offsets.confirm : { x: -1, y: -48 };
        const staticOffset = (skinData && skinData.strumline && skinData.strumline.offsets && skinData.strumline.offsets.static)
                              ? skinData.strumline.offsets.static : { x: 0, y: 0 };
        
        const textureKey = this.noteSkin ? this.noteSkin.getTextureKey('strumline') : 'noteStrumline';

        for (let i = 0; i < this.laneCount; i++) {
            const sprite = this.strumSprites[i];
            if (!sprite) continue;

            if (this.scene.uiCamera) {
                this.scene.uiCamera.ignore(sprite);
            }

            const dirIndex = i % 4;
            const isActive = activeLanes[i];

            if (isActive) {
                if (!sprite.isPlayingConfirm) {
                    const dirName = NoteDirection.getName(dirIndex);
                    const suffix = `_${textureKey}`;
                    const confirmAnimKey = `confirm_${dirName}${suffix}`;

                    if (this.scene.anims.exists(confirmAnimKey)) {
                        sprite.play(confirmAnimKey);
                    } else {
                        sprite.setAlpha(1); 
                    }
                    
                    sprite.x = sprite.baseX + confirmOffset.x;
                    sprite.y = sprite.baseY + confirmOffset.y; 

                    sprite.isPlayingConfirm = true;
                }
            } else {
                if (sprite.isPlayingConfirm) {
                    const dirName = NoteDirection.getName(dirIndex);
                    const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
                    
                    const possibleFrames = [`static${capDirName}0001`, `arrow${NoteDirection.getNameUpper(dirIndex)}`, `${dirName}0000`];
                    const tex = sprite.texture;
                    const staticFrame = possibleFrames.find(f => tex.has(f));

                    sprite.stop();
                    if(staticFrame) sprite.setFrame(staticFrame);
                    
                    sprite.x = sprite.baseX + staticOffset.x;
                    sprite.y = sprite.baseY + staticOffset.y;

                    sprite.isPlayingConfirm = false;
                }
            }
        }
    }

    handleDragLogic(delta) {
        if (!this.isDragging || !this.currentDragNoteData) return;

        const pointer = this.scene.input.activePointer;
        const PIXELS_PER_MS = this.scrollSpeed * 0.45;
        const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
        const offsetY = (skinData && skinData.notes && skinData.notes.offsets) ? skinData.notes.offsets.y : 0;
        
        // Auto-Scroll
        const scrollThreshold = 100; 
        const scrollSpeedMs = 2 * delta; 
        if (pointer.y > 720 - scrollThreshold) {
            this.conductor.songPosition += scrollSpeedMs;
        } else if (pointer.y < this.strumLimitY + scrollThreshold) {
            this.conductor.songPosition = Math.max(0, this.conductor.songPosition - scrollSpeedMs);
        }

        // [CORRECCIÓN] Usar getWorldPoint para coordenadas exactas de GameCamera
        const worldPoint = this.scene.gameCamera.getWorldPoint(pointer.x, pointer.y);
        const hoverX = worldPoint.x;
        const hoverY = worldPoint.y;

        if (this.dragMode === 'move') {
            let newLane = -1;
            if (hoverX >= this.startX && hoverX < (this.startX + this.sectionWidth)) {
                newLane = Math.floor((hoverX - this.startX) / this.gridSize);
            } else {
                const playerStart = this.startX + this.sectionWidth + this.gap;
                if (hoverX >= playerStart && hoverX < (playerStart + this.sectionWidth)) {
                    newLane = 4 + Math.floor((hoverX - playerStart) / this.gridSize);
                }
            }

            const halfSize = (this.gridSize * 0.9) / 2;
            const adjustedClickY = hoverY - halfSize;
            let newTime = ((adjustedClickY - 100 - offsetY) / PIXELS_PER_MS) + this.conductor.songPosition;
            
            if (newTime < 0) newTime = 0;

            if (newLane !== -1) {
                this.currentDragNoteData[1] = newLane; 
            }
            this.currentDragNoteData[0] = newTime;
        }
        
        else if (this.dragMode === 'create') {
            const distY = hoverY - this.dragStartY;
            if (distY > 0) {
                const newLength = distY / PIXELS_PER_MS;
                this.currentDragNoteData[2] = newLength;
            } else {
                this.currentDragNoteData[2] = 0;
            }
        }
    }

    updateGhostNote() {
        const pointer = this.scene.input.activePointer;
        const noteUnderMouse = this.findNoteUnderPointer(pointer);

        if (!this.ghostNote || this.isDragging || noteUnderMouse) {
            if (this.ghostNote) this.ghostNote.setVisible(false);
            return;
        }

        if (pointer.y < this.strumLimitY || (!pointer.isDown && (pointer.x < 0 || pointer.x > 1280 || pointer.y > 720))) {
            this.ghostNote.setVisible(false);
            return;
        }
        
        // [CORRECCIÓN] Usar getWorldPoint
        const worldPoint = this.scene.gameCamera.getWorldPoint(pointer.x, pointer.y);
        const hoverX = worldPoint.x;
        const hoverY = worldPoint.y;
        
        let lane = -1;
        if (hoverX >= this.startX && hoverX < (this.startX + this.sectionWidth)) {
            lane = Math.floor((hoverX - this.startX) / this.gridSize);
        } else {
            const playerStart = this.startX + this.sectionWidth + this.gap;
            if (hoverX >= playerStart && hoverX < (playerStart + this.sectionWidth)) {
                lane = 4 + Math.floor((hoverX - playerStart) / this.gridSize);
            }
        }

        const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
        const noteOffsets = (skinData && skinData.notes && skinData.notes.offsets) ? skinData.notes.offsets : { x: 0, y: 0 };

        if (lane !== -1) {
            const leftX = this.getLaneX(lane);
            const halfSize = (this.gridSize * 0.9) / 2;
            
            this.ghostNote.setPosition(leftX + noteOffsets.x, hoverY - halfSize);
            
            const dirIndex = lane % 4;
            const dirName = NoteDirection.getName(dirIndex);
            const capDirName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            this.ghostNote.setFrame(`note${capDirName}0001`);
            this.ghostNote.setScale((this.gridSize * 0.9) / this.ghostNote.width);
            this.ghostNote.setVisible(true);
            
            // [FIX] Ignore Ghost Note en UICamera
            if (this.scene.uiCamera) {
                this.scene.uiCamera.ignore(this.ghostNote);
            }
        } else {
            this.ghostNote.setVisible(false);
        }
    }
    
    updateScroll(newTime) { this.update(0); }

    findNoteUnderPointer(pointer) {
        if (!pointer) return null;
        
        const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
        const noteOffsets = (skinData && skinData.notes && skinData.notes.offsets) ? skinData.notes.offsets : { x: 0, y: 0 };
        const PIXELS_PER_MS = this.scrollSpeed * 0.45;
        const songPos = this.conductor.songPosition;
        
        const hitBoxSize = this.gridSize * 0.9;
        
        // [CORRECCIÓN] Usar getWorldPoint
        const worldPoint = this.scene.gameCamera.getWorldPoint(pointer.x, pointer.y);
        const hoverX = worldPoint.x;
        const hoverY = worldPoint.y;

        let lane = -1;
        if (hoverX >= this.startX && hoverX < (this.startX + this.sectionWidth)) {
            lane = Math.floor((hoverX - this.startX) / this.gridSize);
        } else {
            const playerStart = this.startX + this.sectionWidth + this.gap;
            if (hoverX >= playerStart && hoverX < (playerStart + this.sectionWidth)) {
                lane = 4 + Math.floor((hoverX - playerStart) / this.gridSize);
            }
        }
        
        if (lane === -1) return null;

        const sections = this.dataManager.getNotes();
        for (const section of sections) {
            for (const note of section.sectionNotes) {
                if (note[1] !== lane) continue;

                const noteTime = note[0];
                const baseY = 100 + (noteTime - songPos) * PIXELS_PER_MS;
                const visualY = baseY + noteOffsets.y;
                
                // Usar coordenadas mundiales convertidas
                if (hoverY >= visualY && hoverY <= visualY + hitBoxSize) {
                    return note;
                }
            }
        }
        return null;
    }

    onPointerDown(pointer) {
        if (pointer.y < this.strumLimitY) return;

        // [CORRECCIÓN] Usar getWorldPoint para obtener coordenadas exactas del juego
        const worldPoint = this.scene.gameCamera.getWorldPoint(pointer.x, pointer.y);
        const clickX = worldPoint.x;
        const clickY = worldPoint.y;

        this.dragStartY = clickY;

        const existingNote = this.findNoteUnderPointer(pointer);
        
        if (existingNote) {
            this.isDragging = true;
            this.dragMode = 'move';
            this.currentDragNoteData = existingNote;
            this.scene.sound.play('clickDown');
            return;
        }
        
        let lane = -1;
        if (clickX >= this.startX && clickX < (this.startX + this.sectionWidth)) {
            lane = Math.floor((clickX - this.startX) / this.gridSize);
        } else {
            const playerStart = this.startX + this.sectionWidth + this.gap;
            if (clickX >= playerStart && clickX < (playerStart + this.sectionWidth)) {
                lane = 4 + Math.floor((clickX - playerStart) / this.gridSize);
            }
        }

        if (lane !== -1) {
            const PIXELS_PER_MS = this.scrollSpeed * 0.45;
            const skinData = this.noteSkin ? this.noteSkin.getSkinData() : null;
            const offsetY = (skinData && skinData.notes && skinData.notes.offsets) ? skinData.notes.offsets.y : 0;
            
            const halfSize = (this.gridSize * 0.9) / 2;
            const adjustedClickY = clickY - halfSize;
            
            const rawTime = ((adjustedClickY - 100 - offsetY) / PIXELS_PER_MS) + this.conductor.songPosition;
            const finalTime = Math.max(0, rawTime);
            
            const createdNote = this.dataManager.addNote(finalTime, lane);
            if (createdNote) {
                this.isDragging = true;
                this.dragMode = 'create'; 
                this.currentDragNoteData = createdNote;
                this.scene.sound.play('clickDown');
            }
        }
    }
    
    onPointerMove(p) {}
    onPointerUp(p) { 
        this.isDragging = false; 
        this.currentDragNoteData = null; 
        this.dragMode = 'none';
    }
}