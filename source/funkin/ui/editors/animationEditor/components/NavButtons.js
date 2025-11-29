export const navConfig = {
    buttons: [
        {
            name: 'Archivo',
            items: [
                { name: 'Nuevo', module: 'File', method: 'new' },
                { name: 'Abrir...', module: 'File', method: 'open' },
                { name: 'Guardar', module: 'File', method: 'save' },
                { name: 'Guardar como ZIP', module: 'File', method: 'saveZip' },
                { name: 'line' },
                { name: 'Salir', module: 'Navigation', method: 'exit' }
            ]
        },
        {
            name: 'Edición',
            items: [
                { name: 'Deshacer', module: 'History', method: 'undo' },
                { name: 'Rehacer', module: 'History', method: 'redo' }
            ]
        },
        {
            name: 'Ver',
            items: [
                { name: 'Propiedades', module: 'Window', method: 'toggleProperties' },
                { name: 'Mapeo de Animaciones', module: 'Window', method: 'toggleMapping' }
            ]
        },
        {
            name: 'Ayuda',
            items: [
                { name: 'Comandos', module: 'Help', method: 'commands' }
            ]
        },
        {
            name: 'img:public/images/ui/editors/settings.svg',
            align: 'right',
            items: [
                { name: 'Preferencias...', module: 'Settings', method: 'open' }
            ]
        }
    ]
};