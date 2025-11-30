/**
 * source/funkin/ui/editors/chartEditor/components/ChartNavConfig.js
 */
const metronomeSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true" style="pointer-events: none;">
    <path fill="currentColor" d="M14.66 3.9a3 3 0 0 0-5.32 0L7.8 6.85l1.42 1.6 1.9-3.6a1 1 0 0 1 1.77 0l7.19 13.7a1 1 0 0 1-.89 1.46H4.81a1 1 0 0 1-.89-1.46l2.31-4.4-1.41-1.61-2.67 5.08A3 3 0 0 0 4.81 22h14.38a3 3 0 0 0 2.66-4.4z"/>
    <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M9.33 14.62 2.75 7.16l1.5-1.32 6.54 7.41A3 3 0 0 1 15 16a3 3 0 1 1-5.67-1.38M11 16a1 1 0 1 1 2 0 1 1 0 0 1-2 0"/>
</svg>
`;

export const navConfig = {
    mainMenu: [
        { name: 'New Chart', module: 'File', method: 'new' },
        { name: 'Save JSON', module: 'File', method: 'save' },
        { name: 'line' },
        { name: 'Exit', module: 'Navigation', method: 'exit' },
        { name: 'line' },
        { name: 'Clear Notes', module: 'Edit', method: 'clear' }
    ],

    widgets: [
        {
            type: 'html',
            html: `
            <div class="mix-editor-toolbar-metronome" style="display: flex; align-items: center; gap: 10px;">
                <div id="metronome-icon-container" 
                     class="navbar-item" 
                     data-module="Editor" 
                     data-method="toggleMetronome"
                     style="display: flex; align-items: center; justify-content: center; width: 30px; cursor: pointer; color: #ccc; transition: color 0.2s;">
                    ${metronomeSVG}
                </div>
                
                <div style="display: flex; align-items: center; border-left: 1px solid #444; border-right: 1px solid #444; padding: 0 10px;">
                    <input type="number" class="bpm-input" value="120">
                    <span class="bpm-label">bpm</span>
                </div>

                <div class="time-sig-container" style="display: flex; align-items: center; gap: 2px; padding-left: 5px;">
                    <span class="time-sig-val">4</span>
                    <span class="separator">/</span>
                    <span class="time-sig-val">4</span>
                </div>
            </div>
            `
        }
    ]
};