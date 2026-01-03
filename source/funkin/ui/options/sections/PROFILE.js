export default class ProfileSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        // --- 1. AVATAR UPLOAD (Igual que antes) ---
        const avatarTrigger = this.domElement.node.querySelector('#avatar-trigger');
        const hiddenInput = this.domElement.node.querySelector('#hidden-avatar-input');
        const liveAvatar = this.domElement.node.querySelector('#live-avatar');

        if (avatarTrigger && hiddenInput && liveAvatar) {
            avatarTrigger.addEventListener('dblclick', () => hiddenInput.click());
            hiddenInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => { liveAvatar.src = ev.target.result; };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }

        // --- 2. USERNAME EDIT (Igual que antes) ---
        const nameDisplay = this.domElement.node.querySelector('#editable-username');
        if (nameDisplay) {
            nameDisplay.addEventListener('dblclick', () => {
                nameDisplay.contentEditable = "true"; nameDisplay.focus();
            });
            nameDisplay.addEventListener('blur', () => {
                nameDisplay.contentEditable = "false";
                if (nameDisplay.innerText.trim() === '') nameDisplay.innerText = "BOYFRIEND";
            });
            nameDisplay.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); nameDisplay.blur(); }
            });
        }

        // --- 3. STATS TOGGLE (TREND LINES) ---
        const btnToggle = this.domElement.node.querySelector('#btn-toggle-stats');
        const numericView = this.domElement.node.querySelector('#stats-numeric-view');
        const graphView = this.domElement.node.querySelector('#stats-graph-view');
        let isGraphMode = false;

        if (btnToggle && numericView && graphView) {
            btnToggle.addEventListener('click', () => {
                isGraphMode = !isGraphMode;

                if (isGraphMode) {
                    // MODO GRÁFICO DE LÍNEAS
                    numericView.style.display = 'none';
                    graphView.style.display = 'block';
                    btnToggle.innerText = "VIEW NUMBERS 🔢";

                    // Generar gráficos solo cuando se muestran (para ahorrar recursos)
                    this.renderAllGraphs(graphView);

                } else {
                    // MODO NUMÉRICO
                    numericView.style.display = 'block';
                    graphView.style.display = 'none';
                    btnToggle.innerText = "VIEW TRENDS 📈";
                }
            });
        }
    }

    // --- LOGICA DE GRAFICOS SVG ---
    // math is hard guys, don't touch this unless you know geometry lol
    renderAllGraphs(container) {
        // 1. Accuracy: Datos altos y estables (85-99)
        this.drawSparkline(container.querySelector('#graph-accuracy'), [88, 90, 89, 92, 91, 95, 92]);

        // 2. Wins: Datos acumulativos (subida constante)
        this.drawSparkline(container.querySelector('#graph-wins'), [2, 4, 8, 10, 15, 18, 25]);

        // 3. Rank: Datos oscilantes
        this.drawSparkline(container.querySelector('#graph-rank'), [3, 4, 2, 5, 4, 6, 6]); // Imagine 6 = S+

        // 4. Score: Volatil
        this.drawSparkline(container.querySelector('#graph-score'), [100, 500, 1200, 3000, 2800, 5000, 8000]);
    }

    drawSparkline(el, data) {
        if (!el) return;
        const color = el.getAttribute('data-color') || '#fff';

        // Limpiar
        el.innerHTML = '';

        // Dimensiones virtuales del SVG
        const width = 200;
        const height = 80;
        const padding = 5;

        // Normalizar datos (Map data to pixels)
        const maxVal = Math.max(...data);
        const minVal = Math.min(...data);
        const range = maxVal - minVal || 1; // Evitar division por cero

        const points = data.map((val, index) => {
            const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
            // Invertimos Y porque en SVG Y=0 es arriba
            const normalizedY = (val - minVal) / range;
            const y = height - (normalizedY * (height - padding * 2) + padding);
            return { x, y };
        });

        // Construir el "Path" (la línea)
        // M = Move to (start), L = Line to
        let d = `M ${points[0].x} ${points[0].y}`;
        points.slice(1).forEach(p => d += ` L ${p.x} ${p.y}`);

        // Construir el área de relleno (baja hasta el fondo y cierra)
        let areaD = d + ` L ${width} ${height} L 0 ${height} Z`;

        // SVG Template
        const svgHTML = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
                <defs>
                    <linearGradient id="grad-${el.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:0.5" />
                        <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                    </linearGradient>
                </defs>
                
                <path d="${areaD}" fill="url(#grad-${el.id})" stroke="none" />
                
                <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 0 2px rgba(0,0,0,0.5))" />
                
                <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="4" fill="#fff" stroke="${color}" stroke-width="2" />
            </svg>
        `;

        el.innerHTML = svgHTML;
    }
}