const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const diffSelect = document.getElementById('difficultySelect');
const convertBtn = document.getElementById('convertBtn');
const converterSelect = document.getElementById('converterSelect');
const downloadLink = document.getElementById('downloadLink');

let chartData = null;

// Drag & Drop handlers
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('hover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('hover');
  }, false);
});

dropArea.addEventListener('click', () => fileInput.click());

dropArea.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFile(files[0]);
});

fileInput.addEventListener('change', () => {
  handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  const text = await file.text();
  try {
    chartData = JSON.parse(text);
    loadDifficulties(chartData);
  } catch (err) {
    alert('Archivo JSON inválido.');
  }
}

function loadDifficulties(data) {
  diffSelect.innerHTML = '<option value="">Selecciona dificultad</option>';

  if (data.notes) {
    // VSCLICE type
    Object.keys(data.notes).forEach(diff => {
      const opt = document.createElement('option');
      opt.value = diff;
      opt.textContent = diff;
      diffSelect.appendChild(opt);
    });
  } else if (data.song) {
    // Psych type (fallback)
    ['Easy', 'Normal', 'Hard'].forEach(diff => {
      const opt = document.createElement('option');
      opt.value = diff.toLowerCase();
      opt.textContent = diff;
      diffSelect.appendChild(opt);
    });
  } else {
    alert('Formato de chart no reconocido.');
  }
}

convertBtn.addEventListener('click', async () => {
  if (!chartData) {
    alert('Carga primero el archivo de chart.');
    return;
  }

  const selectedDiff = diffSelect.value;
  const converterType = converterSelect.value;

  if (!selectedDiff) {
    alert('Selecciona una dificultad.');
    return;
  }

  if (converterType === 'vslice-genesis') {
    // Pedir metadata y chart si es VSCLICE
    let metadata = null;
    let chart = null;

    // Pedir metadata
    metadata = await new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = () => {
        const file = input.files[0];
        file.text().then(txt => {
          document.body.removeChild(input);
          resolve(JSON.parse(txt));
        });
      };
      input.click();
    });

    // Pedir chart si el archivo cargado no es el chart
    if (!chartData.notes || !chartData.notes[selectedDiff]) {
      chart = await new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.onchange = () => {
          const file = input.files[0];
          file.text().then(txt => {
            document.body.removeChild(input);
            resolve(JSON.parse(txt));
          });
        };
        input.click();
      });
    } else {
      chart = chartData;
    }

    // 1. Convertir notas VSCLICE a formato Genesis Engine
    const vsNotes = chart.notes?.[selectedDiff] || [];
    const sections = [];
    const sectionLength = 16;
    const bpm = metadata.timeChanges?.[0]?.bpm || 120;
    const msPerStep = 60000 / bpm / 4; // 4 steps por negra

    vsNotes.forEach(note => {
      const step = Math.floor(note.t / msPerStep);
      const sectionIdx = Math.floor(step / sectionLength);

      while (sections.length <= sectionIdx) {
        sections.push({
          sectionNotes: [],
          lengthInSteps: sectionLength,
          mustHitSection: true // Puedes mejorar esto si tienes info real
        });
      }

      sections[sectionIdx].sectionNotes.push([
        step * msPerStep,
        note.d,
        note.l || 0
      ]);
    });

    // 2. Crear el archivo principal Genesis con metadata
    const playData = metadata.playData || {};
    const chars = playData.characters || {};
    const output = {
      song: {
        song: metadata.songName || "Unknown",
        stage: playData.stage || "stage",
        player1: chars.player || "bf",
        player2: chars.opponent || "dad",
        gfVersion: chars.girlfriend || "gf",
        needsVoices: true,
        bpm: bpm,
        speed: chart.scrollSpeed?.[selectedDiff] || chart.scrollSpeed?.default || 1.5,
        events: ["Events.json"],
        notes: sections
      }
    };

    // 3. Guardar los eventos en Events.json
    // Conversión de eventos VSCLICE a formato Genesis Engine
    let events = chart.events || [];
    if (events.length && events[0].t !== undefined && events[0].e && events[0].v) {
      events = events.map(ev => ({
        time: ev.t,
        script: ev.e,
        inputs: ev.v
      }));
    }
    const eventsObj = { events: events };
    const eventsBlob = new Blob([JSON.stringify(eventsObj, null, 2)], { type: 'application/json' });
    const eventsUrl = URL.createObjectURL(eventsBlob);

    // Descargar chart principal
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${output.song.song || 'chart'}-${selectedDiff}-genesis.json`;
    downloadLink.style.display = 'inline';
    downloadLink.textContent = 'Descargar Chart GenesisEngine';

    // Crear link para eventos
    let eventsDownload = document.getElementById('eventsDownload');
    if (!eventsDownload) {
      eventsDownload = document.createElement('a');
      eventsDownload.id = 'eventsDownload';
      eventsDownload.style.marginLeft = '10px';
      convertBtn.parentNode.appendChild(eventsDownload);
    }
    eventsDownload.href = eventsUrl;
    eventsDownload.download = 'Events.json';
    eventsDownload.style.display = 'inline';
    eventsDownload.textContent = 'Descargar Events.json';
  } else {
    alert('Este convertidor aún no está implementado.');
    return;
  }
});
