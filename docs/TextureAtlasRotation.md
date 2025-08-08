# Sistema de Rotación de Atlas de Texturas

## Descripción

Este sistema maneja automáticamente la rotación de sprites cuando las imágenes han sido rotadas 90° en el atlas de texturas (como ocurre frecuentemente con TexturePacker).

## Funcionamiento

### Problema Original
Cuando TexturePacker optimiza un atlas, puede rotar imágenes 90° en sentido antihorario (CCW) para ahorrar espacio. Esto se indica en el XML con `rotated="true"`. Sin esta corrección, las imágenes aparecen rotadas incorrectamente en el juego.

### Solución Implementada
1. **Detección**: Lee el atributo `rotated="true"` en el XML del atlas
2. **Corrección**: Aplica rotación de 90° en sentido horario (CW) para restaurar la orientación original
3. **Dimensiones**: Intercambia width/height para frames rotados
4. **Posicionamiento**: Ajusta la posición considerando el nuevo origen y rotación

## Archivos Modificados

### TextureAtlasUtils.js (NUEVO)
Utilidad reutilizable para manejar atlas con rotación:
- `parseFrameData()`: Extrae y procesa datos de frame desde XML
- `applySpriteTransform()`: Aplica rotación y posicionamiento correcto
- `extractAllFrames()`: Procesa todos los frames de un atlas
- `createRotationAwareAnimation()`: Crea animaciones que respetan la rotación

### SustainCover.js (ACTUALIZADO)
Sistema de covers para notas hold refactorizado para usar la nueva utilidad:
- Manejo robusto de errores para XMLs faltantes
- Rotación automática basada en datos del atlas
- Pool de sprites mejorado
- Fallback graceful cuando faltan texturas

### PlayState.js (ACTUALIZADO)
Carga automática de texturas holdCover:
- Loop automático para cargar todas las texturas de HOLD_COVERS
- Verificación de existencia antes de cargar

## Uso

### Para desarrolladores
```javascript
// Usar la utilidad directamente
import { TextureAtlasUtils } from '../utils/TextureAtlasUtils.js';

// Parsear datos de frame
const frameData = TextureAtlasUtils.getFrameData(xmlData, 'frameName');

// Aplicar transformación a un sprite
TextureAtlasUtils.applySpriteTransform(sprite, frameData, x, y, scale);

// Crear animación con rotación automática
TextureAtlasUtils.createRotationAwareAnimation(
    scene, 'animKey', 'textureKey', frameNames, 24, false
);
```

### Para artistas/diseñadores
- Las imágenes rotadas en el atlas (con `rotated="true"`) ahora se muestran correctamente
- No es necesario cambiar el proceso de creación de atlas
- El sistema detecta y corrige automáticamente la rotación

## Beneficios

1. **Compatibilidad**: Funciona con atlas creados por TexturePacker y herramientas similares
2. **Automático**: No requiere intervención manual para cada sprite
3. **Reutilizable**: La utilidad puede usarse en cualquier parte del proyecto
4. **Robusto**: Manejo graceful de errores y fallbacks
5. **Optimizado**: Usa pool de sprites para mejor rendimiento

## Notas Técnicas

### Rotación en Atlas
- `rotated="true"` = imagen rotada 90° CCW en el atlas
- Corrección = rotar 90° CW al mostrar = `rotation = Math.PI / 2`
- Dimensiones reales = intercambiar width/height para frames rotados

### Ejemplo de XML
```xml
<SubTexture name="holdCover0000" x="0" y="0" width="50" height="100" rotated="true"/>
```
- En el atlas: 50px ancho × 100px alto (rotado 90° CCW)
- En el juego: 100px ancho × 50px alto (restaurado)

## Próximos Pasos
- El sistema puede extenderse a otros elementos del juego (characters, stages, etc.)
- Posible integración con el StageManager para stages con sprites rotados
- Optimizaciones adicionales para el manejo de pools de sprites

## Debugging y Pruebas

### Script de Debug Incluido
El proyecto incluye `SustainCoverDebug.js` que permite probar el sistema desde la consola:

```javascript
// Comandos disponibles en la consola del navegador:
sustainCoverDebug.testAllCovers()     // Probar todos los covers
sustainCoverDebug.testRotationQuick() // Prueba rápida de rotación
sustainCoverDebug.getInfo()           // Ver estado actual
sustainCoverDebug.help()              // Ver ayuda completa
```

### Problemas Solucionados

1. **Frames Apilados**: Los sprites ahora se resetean completamente entre animaciones
2. **Rotación No Aplicada**: Se aplica transformación en cada frame de la animación
3. **Acumulación de Transformaciones**: Se resetean todas las transformaciones antes de aplicar nuevas
4. **Pool de Sprites**: Los sprites se devuelven al pool en estado limpio

### Logs de Debug
El sistema incluye logs detallados para seguimiento:
- `[SustainCover] Applied transform to frame: ...` - Confirmación de rotación aplicada
- `[SustainCover] Sprite returned to pool and reset` - Confirmación de limpieza
- `[SustainCover] Created rotation-aware animation: ...` - Confirmación de animación creada
