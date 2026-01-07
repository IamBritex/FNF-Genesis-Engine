# FNF genesis engine - Overview

Este engine esta creado especificamente para personas que quieren jugar y moddear fnf en dispositivos que son una absoluta y total mierda. Aqui lo hago accesible de verdad, sin excusas y sin requisitos ridiculos.

Este proyecto no es ningun puto fork de psych ni del juego base, es un fnf creado totalmente desde cero utilizando JavaScript puro. Usamos CDNs estrategicos para optimizar el tamaño final del build y no devorarte la RAM como un animal, manteniendo el performance al maximo nivel posible.

Estoy hasta los huevos de utilizar "lime test windows" y que la mierda de Haxe tarde años en compilar solo para ver un cambio estupido en el codigo. Esa es la puta inspiracion para mandar a la mierda el flujo de trabajo tradicional y crear este proyecto: velocidad real de desarrollo y menos frustraciones tecnicas.

<img src="https://i.pinimg.com/originals/ec/ec/33/ecec330a1bb6b15b03ebd93c63f29d6c.gif" width="300">

## Como se instala?

No tiene ninguna puta ciencia. Puedes presionar el boton de "Code" en github y enseguida presionar el boton de "Download ZIP". Facil, verdad? Hasta un niño podria hacerlo sin ayuda.

Recomiendo utilizar VSCode para este proyecto ya que necesitas abrir un servidor local para que las politicas de CORS no te jodan la existencia. Para facilitar esto puedes utilizar python con el comando:

python -m http.server

O tambien puedes instalar la extension de **Live Server** el cual te permitira ver los cambios en tiempo real de lo que hagas sin tener que reiniciar todo como un idiota. Estas son las instrucciones especificas para poder ejecutar live server:

1. Abre el proyecto en VSCode.
2. Presiona el boton "Go Live" en la barra inferior (esquina derecha).
3. Se abrira tu navegador automaticamente con el proyecto funcionando y listo para testear.

<img src="https://i.pinimg.com/originals/50/55/45/505545dd2f219e82931d92a77c7ba303.gif" width="300">

## Compilacion Nativa y Genesis Installer

Pero si lo tuyo es la potencia real y quieres compilar para tener el control total del sistema, tienes que instalarte este repositorio creado especificamente para funciones nativas en web: [GenesisInstaller](https://github.com/IamBritex/GenesisI-nstaller). Sigue sus instrucciones paso a paso. Te adelantare lo que necesitas para no perder el tiempo:

- **Sistema Operativo:** Windows 10 o 11 exclusivamente.
- **Compilador:** Microsoft Visual C++ (cl.exe). Necesitas Visual Studio 2022 o los Build Tools 2022 instalados correctamente.

Esto te permitira compilar con el comando:

genesis compile

Al usar este metodo, el proyecto **no utiliza Electron**, lo cual es una ventaja enorme porque no se ve limitado por las restricciones de privacidad de Rust y hace el proyecto infinitamente mas ligero. Es mas modificable, evitas ataques XXL y facilitas la interaccion directa con la ventana nativa desde JS utilizando comandos potentes como:

/\*\*

- @param {number} width
- @param {number} height
  \*/
  genesis.window.resize(1280, 720);

Hay un monton de comandos mas esperandote en la documentacion del instalador para que hagas lo que te de la gana con la ventana y el comportamiento nativo.

<img src="https://i.pinimg.com/originals/4a/4c/8c/4a4c8c0149c8b1b6b8efee5e267ea189.gif" width="300">

## Vision y Ambicion del Proyecto

Con este proyecto queremos alcanzar editores profesionales que sean ridiculamente faciles de utilizar para el modder promedio de Friday Night Funkin'. Si ya tienes experiencia en otros editores, aqui te vas a sentir como un dios gracias a la implementacion de:

- **WYSIWYG (What You See Is What You Get):** Edita visualmente y ve el resultado al instante, sin adivinar.
- **Peote-view:** Renderizado de alto rendimiento para que no sientas ni un milisegundo de lag incluso en hardware de mierda.
- **UI/UX y QoL:** Una interfaz pensada para trabajar rapido, con flujos de trabajo que no dan asco.
- **Soft Coding Extremo:** Personaliza absolutamente todo dentro del engine con su propio editor de texto integrado, asemejandose a herramientas profesionales como **Roblox Studio** o **Godot**.

Ademas, estamos implementando versiones tempranas de multijugador online y local para que la experiencia sea completa. Deja de pelearte con motores obsoletos que tardan siglos en cargar y empieza a usar algo que de verdad respete tu tiempo.

## Star History

## Star History

<a href="https://www.star-history.com/#IamBritex/FNF-Genesis-Engine&type=timeline&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=IamBritex/FNF-Genesis-Engine&type=timeline&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=IamBritex/FNF-Genesis-Engine&type=timeline&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=IamBritex/FNF-Genesis-Engine&type=timeline&legend=bottom-right" />
 </picture>
</a>
