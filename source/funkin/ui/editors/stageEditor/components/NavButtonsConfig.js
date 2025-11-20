/**
 * Configuración de los botones y menús para la barra de navegación (NavBarMenu).
 */

const autoSaveItems = [
    { name: 'Cada 5 Minutos', module: 'Stage', method: 'setAutoSave-5' },
    { name: 'Cada 10 Minutos', module: 'Stage', method: 'setAutoSave-10' },
    { name: 'Cada 15 Minutos', module: 'Stage', method: 'setAutoSave-15' },
    { name: 'line' },
    { name: 'Nunca', module: 'Stage', method: 'setAutoSave-0' }
];

const navConfig = {
    buttons: [
        {
            name: 'Archivo',
            items: [
                { name: 'Nuevo Escenario', module: 'Stage', method: 'new' },
                { name: 'Cargar', module: 'Stage', method: 'load' },
                { name: 'Cargar Reciente' },
                { name: 'line'},
                { name: 'Guardar', module: 'Stage', method: 'save' },
                { name: 'Guardar Como', module: 'Stage', method: 'saveEhh' },
                { 
                    name: 'Guardar Automatico', 
                    items: autoSaveItems
                },
                { name: 'line'},
                { name: 'Salir', module: 'Navigation', method: 'exit' }
            ]
        },
        {
            name: 'Edición',
            items: [
                { name: 'Deshacer', module: 'History', method: 'undo' },
                { name: 'Rehacer', module: 'History', method: 'redo' },
                { name: 'line'},
                { name: 'Duplicar', module: 'Edit', method: 'duplicate' },
                { name: 'Copiar', module: 'Edit', method: 'copy' },
                { name: 'Pegar', module: 'Edit', method: 'paste' },
                { name: 'line'},
                { name: 'Encontrar', module: 'Edit', method: 'find' }
            ]
        },
        {
            name: 'Ver',
            items: [
                { name: "Ver Piso", module: "View", method: "toggleFloor" },
                { name: "Limite de caja", module: "View", method: "toggleBoundingBox" },
                { name: 'line'},
                { name: 'Mostrar Camaras', module: 'Cameras', method: 'cameraFields' },
                { name: 'Propiedades', module: 'Window', method: 'toggleProperties' }
            ]
        },
        {
            name: 'Correr',
            items: [
                { name: 'Prueba', module: 'Test', method: 'toggle' }
            ]
        }, 
        {
            name: 'Ayuda',
            items: [
                { name: 'Comandos', module: 'Help', method: 'commands' },
                { name: 'Documentacion', module: 'Help', method: 'documentation' },
                { name: 'line' },
                { name: 'Nuestro Youtube', module: 'Help', method: 'youtube' },
                { name: 'line' },
                { name: 'Acerca de', module: 'Help', method: 'about' }
            ]
        },
        // --- BOTÓN DE CONFIGURACIÓN (SETTINGS) ---
        {
            // Usamos el prefijo 'img:' para indicar que es un ícono
            name: 'img:public/images/ui/editors/settings.svg',
            align: 'right', // Alineado a la derecha
            items: [
                { name: 'Preferencias del Editor...', module: 'Settings', method: 'editorPrefs' }
            ]
        }
    ]
};

export default navConfig;