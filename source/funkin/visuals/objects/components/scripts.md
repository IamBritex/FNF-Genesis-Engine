# Documentación de Scripts - Genesis Engine

## Descripción General
El Genesis Engine permite usar scripts en JavaScript para modificar el gameplay, añadir efectos y crear eventos personalizados en los stages.

## Estructura de Scripts
Todos los scripts deben ser clases ES6 con una exportación por defecto y seguir esta estructura:

```javascript
export default class MiScript {
    constructor(scene) {
        this.scene = scene;
    }

    // Métodos opcionales
    async init() {}        // Se llama cuando el script se carga
    update(time, delta) {} // Se llama cada frame
    cleanup() {}          // Se llama al descargar el script
    destroy() {}          // Se llama al destruir el script
}
```

## Scripts Disponibles

### 1. Scripts de Stage
Estos scripts se cargan automáticamente según la configuración del stage en los archivos JSON.

#### WindowsChanges.js
- Propósito: Controla los cambios de color de las ventanas en el stage Philly
- Métodos:
  - `changeWindow(windowIndex)`: Cambia la textura de la ventana
  - `update(time, delta)`: Maneja los cambios de ventana según el beat

#### TrainStreet.js
- Propósito: Controla el tren en el stage Philly
- Métodos:
  - `startTrainMovement()`: Inicia la animación del tren
  - `resetTrainPositions()`: Reinicia la posición del tren

### 2. Scripts de Eventos
Scripts que se pueden activar en momentos específicos durante las canciones.

#### Ejemplo de Uso en Chart:
```json
{
    "events": [
        {
            "time": 1000,
            "script": "CameraShake",
            "params": {
                "intensity": 0.05,
                "duration": 0.5
            }
        }
    ]
}
```

## Propiedades y Métodos Disponibles

### Acceso a la Escena
Los scripts tienen acceso a lo siguiente a través de `this.scene`:
- `songPosition`: Posición actual en la canción (ms)
- `characters`: Gestión de personajes
- `stageManager`: Gestión del stage
- `cameraController`: Controles de cámara
- `healthBar`: Gestión de la barra de salud

### Control de Cámara
```javascript
// Ejemplos de control de cámara
this.scene.cameraController.shake(intensidad, duracion); // Hacer temblar la cámara
this.scene.cameraController.flash(color, duracion);      // Flash de cámara
this.scene.cameraController.fade(color, duracion);       // Fundido de cámara
```

### Control de Personajes
```javascript
// Ejemplos de control de personajes
this.scene.characters.playAnimation('gf', 'dance');           // Reproducir animación
this.scene.characters.setCharacterPosition('boyfriend', x, y); // Mover personaje
```

### Elementos del Stage
```javascript
// Ejemplos de manipulación del stage
this.scene.stageManager.getLayer(nombreCapa).setVisible(false); // Ocultar capa
this.scene.stageManager.getLayer(nombreCapa).setAlpha(0.5);     // Transparencia
```

## Creación de Scripts Personalizados

1. Crear un nuevo archivo .js en `/public/assets/data/scripts/`
2. Usar la estructura básica:
```javascript
export default class ScriptPersonalizado {
    constructor(scene) {
        this.scene = scene;
    }

    async init() {
        // Código de inicialización
    }

    update(time, delta) {
        // Actualizaciones por frame
    }

    cleanup() {
        // Código de limpieza
    }
}
```

3. Registrar en el JSON del stage:
```json
{
    "stage": [...],
    "scripts": ["ScriptPersonalizado"]
}
```

## Buenas Prácticas

1. Siempre limpiar recursos en el método cleanup()
2. Usar async/await para cargar recursos
3. Verificar que los elementos existan antes de usarlos
4. Usar bloques try-catch para manejar errores
5. Documentar el propósito y parámetros del script

## Sistema de Eventos
Los scripts pueden escuchar y emitir eventos:
```javascript
// Escuchar eventos
this.scene.events.on('beat', this.onBeat, this);

// Emitir eventos
this.scene.events.emit('eventoPersonalizado', { data: valor });
```

## Eventos Comunes
- `beat`: Activado en los beats de la canción
- `sectionHit`: Activado en cambios de sección
- `noteHit`: Activado cuando se golpea una nota
- `enemyNoteHit`: Activado cuando el enemigo golpea una nota
- `playerDeath`: Activado en la muerte del jugador

## Depuración
Usar console.log() para depurar:
```javascript
console.log('Debug del script:', {
    songPosition: this.scene.songPosition,
    currentBeat: this.scene.lastBeat
});
```

## Ejemplos

### Script de Temblor de Cámara
```javascript
export default class CameraShake {
    constructor(scene) {
        this.scene = scene;
    }

    async init() {
        this.scene.cameraController.shake(0.05, 0.5);
    }
}
```

### Script de Evento Personalizado
```javascript
export default class EventoPersonalizado {
    constructor(scene) {
        this.scene = scene;
    }

    async init() {
        this.scene.events.on('disparadorPersonalizado', this.onTrigger, this);
    }

    onTrigger(data) {
        // Manejar evento
    }

    cleanup() {
        this.scene.events.off('disparadorPersonalizado', this.onTrigger, this);
    }
}
```

<!-- Recuerda siempre probar tus scripts exhaustivamente y manejar los errores apropiadamente. -->