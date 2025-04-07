
export async function getCharacterFiles() {
    try {
        // Leer el archivo Characters.txt
        const response = await fetch('public/assets/data/characters/Characters.txt');
        const text = await response.text();

        // Dividir el contenido del archivo en líneas y agregar ".json" a cada línea
        const files = text.split('\n').map(line => line.trim()).filter(line => line !== '').map(line => `${line}.json`);
        return files;
    } catch (error) {
        console.error('Error loading character files:', error);
        return [];
    }
}