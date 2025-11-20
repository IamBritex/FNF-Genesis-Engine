export function getLayerPanelStyles() {
    const colorPrimary = '#663399';
    const colorDark = '#4a2c66';
    const colorHover = '#7a4fcf';
    const colorItemBg = '#5a3c76';
    const colorFolderBg = '#3a2250';
    const colorDragging = '#8e5cd9';
    
    return `
        .layers-panel-wrapper { width: 100%; height: 100%; pointer-events: none; }
        .layers-panel-container {
            position: relative; background-color: ${colorDark};
            border: 2px solid ${colorPrimary}; border-right: none;
            display: flex; flex-direction: column; font-family: Arial, sans-serif; color: white; pointer-events: auto;
        }
        .layers-toggle-btn {
            position: absolute; left: -24px; top: 50%; transform: translateY(-50%);
            width: 24px; height: 60px; background-color: ${colorPrimary}; border: 2px solid ${colorDark};
            border-right: none; border-radius: 8px 0 0 8px; color: white; font-weight: bold; cursor: pointer;
            display: flex; align-items: center; justify-content: center; pointer-events: auto;
        }
        .layers-title-bar {
            background-color: ${colorPrimary}; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; z-index: 10;
        }
        .layers-title { font-weight: bold; }
        
        .layers-actions { display: flex; gap: 5px; align-items: center; }
        .layers-add-wrapper { position: relative; }
        
        .layers-add-btn, .layers-popup-btn {
            background-color: ${colorDark}; color: white; border: none; font-size: 20px; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .layers-popup-btn:hover, .layers-add-btn:hover {
            background-color: ${colorHover};
        }

        /* Dropdown Styles */
        .layers-dropdown {
            position: absolute; top: 100%; right: 0;
            background-color: ${colorDark}; border: 1px solid ${colorPrimary};
            border-radius: 4px; display: flex; flex-direction: column;
            min-width: 100px; z-index: 100; box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        .dd-item {
            background: none; border: none; color: white; padding: 8px 12px; text-align: left; cursor: pointer; font-size: 13px;
        }
        .dd-item:hover { background-color: ${colorHover}; }

        .layers-list-scroll-area {
            flex-grow: 1; overflow-y: auto; overflow-x: hidden; position: relative; background-color: #2a1836;
        }
        .layers-list-content { position: relative; width: 100%; }

        .layer-node-wrapper {
            position: absolute; left: 0; top: 0; width: 100%; transition: none; 
        }
        .layer-item {
            height: 40px; background-color: ${colorItemBg}; display: flex; align-items: center; cursor: pointer;
            margin: 0 5px; border: 1px solid ${colorPrimary}; border-radius: 4px; box-sizing: border-box; user-select: none;
        }
        .layer-content-inner {
            display: flex; align-items: center; justify-content: space-between; width: 100%; padding-right: 10px; padding-left: 10px;
        }
        .layer-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .layer-buttons { display: flex; gap: 5px; align-items: center; }
        .btn-vis { background: none; border: none; cursor: pointer; opacity: 0.7; padding: 2px; }
        .btn-vis:hover { opacity: 1; }
        .layer-grip { cursor: grab; color: #aaa; font-size: 16px; }
        .layer-folder-header {
            height: 32px; background-color: ${colorFolderBg}; border: 1px solid #553377; border-radius: 4px;
            display: flex; align-items: center; color: #ddd; font-size: 12px; font-weight: bold; cursor: pointer;
            margin: 0 5px; box-sizing: border-box; padding-left: 5px; user-select: none;
        }
        .folder-arrow-btn {
            width: 20px; height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-right: 5px;
        }
        .folder-title:hover { color: white; text-decoration: underline dotted; cursor: text; }
        .folder-rename-input {
            background: #1a0f24; border: 1px solid ${colorHover}; color: white; font-size: 12px; padding: 2px; width: 140px;
        }
        .selected { border-color: white; background-color: ${colorHover}; }
        .dragging {
            background-color: ${colorDragging} !important; border-color: white !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 1000;
        }
        .merge-target {
            border: 2px dashed #d580ff !important; background-color: #361945 !important;
        }
        .layers-list-scroll-area::-webkit-scrollbar { width: 8px; }
        .layers-list-scroll-area::-webkit-scrollbar-track { background: ${colorDark}; }
        .layers-list-scroll-area::-webkit-scrollbar-thumb { background-color: ${colorHover}; border-radius: 4px; }
    `;
}