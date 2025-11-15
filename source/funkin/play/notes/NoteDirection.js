/**
 * NoteDirection.js
 * Proporciona constantes y utilidades para las direcciones de las notas.
 */
export const NoteDirection = {
    // --- Constantes de Dirección ---
    LEFT: 0,
    DOWN: 1,
    UP: 2,
    RIGHT: 3,

    // --- Colores asociados (puedes ajustar estos según necesites) ---
    _colors: [
        '#C241B8', // LEFT (Purple)
        '#00FFFF', // DOWN (Blue)
        '#12FA05', // UP (Green)
        '#F9393F', // RIGHT (Red)
    ],
    _colorNames: [
        'purple', // LEFT
        'blue',   // DOWN
        'green',  // UP
        'red',    // RIGHT
    ],
    _names: [
        'left', // LEFT
        'down', // DOWN
        'up',   // UP
        'right' // RIGHT
    ],

    /**
     * Convierte un entero cualquiera a una dirección válida (0-3) usando módulo.
     * @param {number} value - El número entero a convertir.
     * @returns {number} Una dirección válida (0, 1, 2, o 3).
     */
    fromInt(value) {
        // Asegurarse de que sea un número entero
        const intValue = Math.floor(value || 0);
        // Usar módulo para obtener un valor entre 0 y 3
        // El doble módulo maneja números negativos correctamente ((n % m) + m) % m
        return ((intValue % 4) + 4) % 4;
    },

    /**
     * Obtiene el nombre en minúsculas de la dirección.
     * @param {number} direction - La dirección (0-3).
     * @returns {string} El nombre (ej. 'left') o 'unknown'.
     */
    getName(direction) {
        const validDirection = NoteDirection.fromInt(direction); // Asegura que sea 0-3
        return NoteDirection._names[validDirection] || 'unknown';
    },

    /**
     * Obtiene el nombre en mayúsculas de la dirección.
     * @param {number} direction - La dirección (0-3).
     * @returns {string} El nombre (ej. 'LEFT') o 'UNKNOWN'.
     */
    getNameUpper(direction) {
        return NoteDirection.getName(direction).toUpperCase();
    },

    /**
     * Obtiene el color hexadecimal asociado a la dirección.
     * @param {number} direction - La dirección (0-3).
     * @returns {string} El color (ej. '#C241B8') o un color por defecto.
     */
    getColor(direction) {
        const validDirection = NoteDirection.fromInt(direction);
        return NoteDirection._colors[validDirection] || '#FFFFFF'; // Blanco por defecto
    },

    /**
     * Obtiene el nombre del color asociado a la dirección.
     * @param {number} direction - La dirección (0-3).
     * @returns {string} El nombre del color (ej. 'purple') o 'unknown'.
     */
    getColorName(direction) {
        const validDirection = NoteDirection.fromInt(direction);
        return NoteDirection._colorNames[validDirection] || 'unknown';
    }
};

// Ejemplo de uso (lo puedes quitar al usarlo):
/*
console.log(NoteDirection.LEFT); // Output: 0
console.log(NoteDirection.fromInt(5)); // Output: 1 (DOWN)
console.log(NoteDirection.fromInt(-1)); // Output: 3 (RIGHT)
console.log(NoteDirection.getName(NoteDirection.UP)); // Output: 'up'
console.log(NoteDirection.getColorName(0)); // Output: 'purple'
console.log(NoteDirection.getColor(NoteDirection.RIGHT)); // Output: '#F9393F'
*/