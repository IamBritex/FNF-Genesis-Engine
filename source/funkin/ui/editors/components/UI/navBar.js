export const mainEditorNavConfig = {
    buttons: [
        {
            name: 'Archivo',
            items: [
                { name: 'Guardar Todo', module: 'Project', method: 'save' },
                { name: 'Salir', module: 'Navigation', method: 'exit' }
            ]
        },
        {
            name: 'Ver',
            items: [
                { name: 'Resetear Zoom', module: 'View', method: 'resetZoom' }
            ]
        },
        {
            name: 'Ayuda',
            align: 'right',
            items: [
                { name: 'Acerca de Genesis', module: 'Help', method: 'about' }
            ]
        }
    ]
};