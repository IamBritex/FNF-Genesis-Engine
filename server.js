const express = require('express');
const { execSync, exec } = require('child_process');

const app = express();
const port = 3000;

app.use(express.static(__dirname));

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);

  // Siempre compilar WebViewer.java
  console.log('Compilando WebViewer.java...');
  try {
    execSync('javac --module-path /usr/share/openjfx/lib --add-modules javafx.controls,javafx.fxml,javafx.web WebViewer.java');
    console.log('Compilación completada.');
  } catch (err) {
    console.error('Error al compilar WebViewer.java:', err.message);
    return;
  }

  // Siempre empaquetar app.jar
  console.log('Empaquetando app.jar...');
  try {
    execSync('jar cfe app.jar WebViewer WebViewer.class');
    console.log('Empaquetado completado.');
  } catch (err) {
    console.error('Error al empaquetar app.jar:', err.message);
    return;
  }

  // Ejecutar java con JavaFX para abrir la ventana nativa
  console.log('Abriendo ventana JavaFX...');
  exec('java --module-path /usr/share/openjfx/lib --add-modules javafx.controls,javafx.fxml,javafx.web -jar app.jar', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error ejecutando java: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
});
