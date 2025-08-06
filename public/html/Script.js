// source/core/Cursor.js
const CURSOR_BASE_PATH = 'public/assets/images/cursor/';

const customCursors = {
  default: `url("${CURSOR_BASE_PATH}cursor-default.png"), auto`,
  pointer: `url("${CURSOR_BASE_PATH}cursor-pointer.png"), pointer`,
  text: `url("${CURSOR_BASE_PATH}cursor-text.png"), text`,
  wait: `url("${CURSOR_BASE_PATH}cursor-hourglass.png"), wait`,
  grab: `url("${CURSOR_BASE_PATH}cursor-grabbing.png"), grab`,
  grabbing: `url("${CURSOR_BASE_PATH}cursor-grabbing.png"), grabbing`,
  notAllowed: `url("${CURSOR_BASE_PATH}cursor-cross.png"), not-allowed`
};

// Precarga con verificación
function preloadCursors(callback) {
  let loadedCount = 0;
  const totalCursors = Object.keys(customCursors).length;
  
  Object.entries(customCursors).forEach(([name, cursorValue]) => {
    const img = new Image();
    const url = cursorValue.match(/url\("([^"]+)"\)/)[1];
    img.src = url;
    
    img.onload = () => {
      loadedCount++;
      if (loadedCount === totalCursors) {
        callback(true);
      }
    };
    
    img.onerror = () => {
      console.error(`Error al cargar cursor: ${name}`, url);
      callback(false, name);
    };
  });
}

function applyCustomCursors() {
  const style = document.createElement('style');
  style.id = 'custom-cursors-style';
  
  style.textContent = `
    /* Reset primero */
    * {
      cursor: ${customCursors.default} !important;
    }
    
    /* Elementos interactivos */
    a, button, [role="button"], [onclick], 
    [tabindex]:not([tabindex="-1"]):not([disabled]) {
      cursor: ${customCursors.default} !important;
    }
    
    /* Estados hover */
    a:hover, button:not(:disabled):hover, 
    [role="button"]:hover, [onclick]:hover, 
    [tabindex]:not([tabindex="-1"]):not([disabled]):hover {
      cursor: ${customCursors.pointer} !important;
    }
    
    /* Campos de texto */
    input[type="text"], input[type="password"], 
    input[type="email"], input[type="search"], 
    input[type="url"], input[type="tel"], 
    input[type="number"], textarea, [contenteditable] {
      cursor: ${customCursors.text} !important;
    }
    
    /* Estado de espera */
    .wait, [aria-busy="true"], [disabled] {
      cursor: ${customCursors.wait} !important;
    }
    
    /* Scroll */
    [style*="overflow: scroll"], [style*="overflow: auto"] {
      cursor: ${customCursors.grab} !important;
    }
    
    [style*="overflow: scroll"]:active, 
    [style*="overflow: auto"]:active {
      cursor: ${customCursors.grabbing} !important;
    }
    
    /* No permitido */
    .not-allowed, [disabled], [aria-disabled="true"] {
      cursor: ${customCursors.notAllowed} !important;
    }
  `;
  
  // Limpiar estilos previos
  const oldStyle = document.getElementById('custom-cursors-style');
  if (oldStyle) oldStyle.remove();
  
  document.head.appendChild(style);
}

// Inicialización mejorada
function initCursors() {
  preloadCursors((success, failedCursor) => {
    if (success) {
      applyCustomCursors();
      
      // Verificación final
      setTimeout(() => {
        const testElement = document.createElement('div');
        document.body.appendChild(testElement);
        document.body.removeChild(testElement);
      }, 100);
    } else {
      console.error(`No se pudo cargar el cursor: ${failedCursor}. Verifica la ruta: ${CURSOR_BASE_PATH}`);
    }
  });
}

// Iniciar
if (document.readyState === 'complete') {
  initCursors();
} else {
  document.addEventListener('DOMContentLoaded', initCursors);
}