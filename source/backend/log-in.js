import { firebaseConfig } from './firebaseConfig.js';

export class FirebaseManager {
    constructor(scene) {
        this.scene = scene;
        this.initializeFirebase();
    }

    initializeFirebase() {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    }

    setupAuthListener(callbacks) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.handleSignInSuccess(user);
                callbacks.onSignIn?.();
            } else {
                callbacks.onSignOut?.();
            }
        });
    }

    async handleGoogleSignIn() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            await this.handleSignInSuccess(result.user);
        } catch (error) {
            console.error('Error signing in with Google:', error);
        }
    }

    async handleSignInSuccess(user) {
        try {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();

            const userProfile = {
                name: user.displayName?.length > 12 ?
                    user.displayName.substring(0, 12) :
                    user.displayName
            };

            if (userData?.lastNameChange) {
                localStorage.setItem('lastNameChange', userData.lastNameChange.toString());
            }

            return userProfile;

        } catch (error) {
            console.error('Error loading user data:', error);
            throw error;
        }
    }

    async handleSignOut() {
        try {
            await firebase.auth().signOut();
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            return false;
        }
    }

    getCurrentUser() {
        return firebase.auth().currentUser;
    }
}

// Mantener la clase ProfileModal existente pero actualizarla para usar FirebaseManager
export class ProfileModal {
    constructor(scene) {
        this.scene = scene;
        this.firebaseManager = new FirebaseManager(scene);
        this.lastNameChange = localStorage.getItem('lastNameChange') || 0;
        this.modal = null;
        this.nameInput = null;
        this.errorText = null;
        this.inputElement = null;
        this.originalKeyboardHandler = null;
        this.blurFilter = null;
    }

    show(currentName) {
        // Guardar y deshabilitar keyboard handlers originales
        this.originalKeyboardHandler = [...this.scene.input.keyboard.listeners('keydown')];
        this.scene.input.keyboard.removeAllListeners('keydown');

        // Crear múltiples capas de overlay para efecto blur
        const numLayers = 3;
        const baseAlpha = 0.2;
        
        for (let i = 0; i < numLayers; i++) {
            this.scene.add.rectangle(0, 0,
                this.scene.cameras.main.width,
                this.scene.cameras.main.height,
                0x000000, baseAlpha)
                .setOrigin(0)
                .setDepth(999 + i);
        }

        // Crear overlay semitransparente principal
        const overlay = this.scene.add.rectangle(0, 0,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000, 0.5)
            .setOrigin(0)
            .setDepth(1000);

        // Crear ventana modal
        const modalWidth = 400;
        const modalHeight = 500;
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;

        this.modal = this.scene.add.rectangle(centerX, centerY,
            modalWidth, modalHeight, 0x333333)
            .setDepth(1001);

        // Añadir foto de perfil como imagen estática
        const pfp = this.scene.add.image(centerX, centerY - 100, 'placeholder')
            .setScale(0.8)
            .setDepth(1002);

        // Input background (rectángulo blanco)
        const inputBackground = this.scene.add.rectangle(
            centerX,
            centerY + 50,
            300,
            40,
            0xFFFFFF
        )
        .setOrigin(0.5)
        .setDepth(1002);

        // Input personalizado
        let inputText = currentName || '';
        const textDisplay = this.scene.add.text(centerX, centerY + 50, inputText, {
            fontFamily: 'VCR',
            fontSize: '24px',
            color: '#000000', // Cambiar a negro para que contraste con el fondo blanco
            align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(1003);

        // Cursor parpadeante (ahora en negro)
        const cursor = this.scene.add.rectangle(
            centerX + textDisplay.width/2 + 2,
            centerY + 50,
            2,
            24,
            0x000000 // Cambiar a negro para que contraste con el fondo blanco
        )
        .setDepth(1003);

        // Animación del cursor
        this.scene.tweens.add({
            targets: cursor,
            alpha: 0,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Actualizar posición del cursor
        const updateCursorPosition = () => {
            cursor.x = centerX + textDisplay.width/2 + 2;
        };

        // Keyboard handler para el input
        const keyboardHandler = (event) => {
            if (!this.modal) return;

            if (event.key === 'Escape') {
                this.close();
                return;
            }

            if (event.key === 'Backspace') {
                inputText = inputText.slice(0, -1);
            } else if (event.key === 'Enter') {
                this.handleSave(inputText);
                return;
            } else if (event.key.length === 1 && inputText.length < 12) {
                // Solo permitir letras, números y espacios
                if (/^[a-zA-Z0-9\s]$/.test(event.key)) {
                    inputText += event.key;
                }
            }

            textDisplay.setText(inputText);
            updateCursorPosition();
        };

        this.scene.input.keyboard.on('keydown', keyboardHandler);

        // Error text
        this.errorText = this.scene.add.text(centerX, centerY + 100, '', {
            fontFamily: 'VCR',
            fontSize: '18px',
            color: '#FF0000',
            align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(1003);

        // Botones
        const saveButton = this.scene.add.text(centerX, centerY + 150, 'Guardar', {
            fontFamily: 'VCR',
            fontSize: '24px',
            color: '#FFFFFF',
            backgroundColor: '#444444',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(1002)
        .on('pointerdown', () => this.handleSave(inputText));

        const closeButton = this.scene.add.text(
            centerX + modalWidth/2 - 30, 
            centerY - modalHeight/2 + 20, 
            'X', 
            {
                fontFamily: 'VCR',
                fontSize: '24px',
                color: '#FFFFFF'
            }
        )
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(1002)
        .on('pointerdown', () => this.close());
    }

    async handleSave(newName) {
        try {
            // Validaciones básicas
            if (newName.length === 0) {
                this.showError('El nombre no puede estar vacío');
                return;
            }
            if (newName.length > 12) {
                this.showError('Máximo 12 caracteres');
                return;
            }
            if (!/^[a-zA-Z0-9\s]*$/.test(newName)) {
                this.showError('Solo letras y números permitidos');
                return;
            }
            if (newName.includes('http') || newName.includes('www')) {
                this.showError('No se permiten links');
                return;
            }

            // Verificar si el nombre ya existe
            const db = firebase.firestore();
            const nameQuery = await db.collection('users')
                .where('displayName', '==', newName)
                .get();

            if (!nameQuery.empty && nameQuery.docs[0].id !== firebase.auth().currentUser.uid) {
                this.showError('Este nombre ya está en uso');
                return;
            }

            const user = firebase.auth().currentUser;
            if (!user) {
                this.showError('No hay usuario conectado');
                return;
            }

            // Verificar tiempo desde último cambio
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            const now = Date.now();

            if (userData && userData.lastNameChange) {
                const daysSinceLastChange = (now - userData.lastNameChange) / (1000 * 60 * 60 * 24);
                if (daysSinceLastChange < 12) {
                    const daysLeft = Math.ceil(12 - daysSinceLastChange);
                    this.showError(`Espera ${daysLeft} días para cambiar tu nombre`);
                    return;
                }
            }

            // Si pasa todas las validaciones, actualizar
            try {
                const db = firebase.firestore();
                const userRef = db.collection('users').doc(user.uid);
                
                // Primero verificar si el documento existe
                const doc = await userRef.get();
                
                if (!doc.exists) {
                    // Si no existe, crear documento inicial
                    await userRef.set({
                        displayName: newName,
                        lastNameChange: now,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Si existe, actualizar
                    await userRef.update({
                        displayName: newName,
                        lastNameChange: now,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                // Actualizar perfil de Auth
                await user.updateProfile({ displayName: newName });

                localStorage.setItem('lastNameChange', now.toString());
                this.lastNameChange = now;
                this.scene.handleSignInSuccess(user);
                this.showToast('Nombre guardado correctamente', 'success');
                this.close();
            } catch (firebaseError) {
                console.error('Firebase error:', firebaseError);
                this.showError('Error al guardar los cambios');
            }

        } catch (error) {
            this.showError(error.message || 'Error al procesar la solicitud');
            console.error('Error in handleSave:', error);
        }
    }

    showError(message) {
        if (this.errorText) {
            this.errorText.setText(message);
            this.errorText.setVisible(true);
            
            // Auto-hide error after 3 seconds
            this.scene.time.delayedCall(3000, () => {
                if (this.errorText) {
                    this.errorText.setVisible(false);
                }
            });
        }
    }

    showToast(message, type = 'error') {
        const color = type === 'success' ? '#4CAF50' : '#F44336';
        
        const toast = this.scene.add.text(
            this.scene.cameras.main.centerX,
            100,
            message,
            {
                fontFamily: 'VCR',
                fontSize: '24px',
                color: '#FFFFFF',
                backgroundColor: color,
                padding: { x: 20, y: 10 }
            }
        )
        .setOrigin(0.5)
        .setDepth(1100)
        .setAlpha(0);

        // Animate toast in and out
        this.scene.tweens.add({
            targets: toast,
            alpha: 1,
            y: 120,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.scene.time.delayedCall(2000, () => {
                    this.scene.tweens.add({
                        targets: toast,
                        alpha: 0,
                        y: 100,
                        duration: 200,
                        ease: 'Power2',
                        onComplete: () => {
                            toast.destroy();
                        }
                    });
                });
            }
        });
    }

    close() {
        // Limpiar modal
        if (this.modal) {
            this.modal.destroy();
            this.modal = null;
        }
        
        // Limpiar elementos visuales de manera segura
        this.scene.children.list
            .filter(child => child.depth >= 999 && !child.destroyed)
            .forEach(child => child.destroy());

        // Restaurar keyboard handlers originales de manera segura
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.removeAllListeners('keydown');
            if (typeof this.scene.setupInputs === 'function') {
                this.scene.setupInputs();
            }
            this.scene.input.keyboard.enabled = true;
        }
        
        // Re-habilitar la interacción con el menú de manera segura
        if (this.scene && this.scene.options) {
            this.scene.options.forEach(option => {
                if (!option || !option.text) return;
                
                try {
                    // Verificar que los objetos existan y sean válidos antes de intentar hacerlos interactivos
                    if (option.text.scene && !option.text.destroyed) {
                        option.text.setInteractive();
                    }
                    
                    if (option.valueText && 
                        option.valueType === 'boolean' && 
                        option.valueText.scene && 
                        !option.valueText.destroyed) {
                        option.valueText.setInteractive();
                    }
                } catch (error) {
                    console.warn('Error re-enabling interaction for option:', option.text?.text);
                }
            });
        }

        // Actualizar selección actual de manera segura
        if (this.scene && 
            typeof this.scene.updateSelection === 'function' && 
            !this.scene.scene.isProcessing) {
            try {
                this.scene.updateSelection();
            } catch (error) {
                console.warn('Error updating selection:', error);
            }
        }
    }
}