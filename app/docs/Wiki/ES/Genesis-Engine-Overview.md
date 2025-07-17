<img src="https://media.discordapp.net/attachments/1380940864842629281/1382145077484458024/108_sin_titulo_20250610184943.png?ex=684b67e9&is=684a1669&hm=cfe295ea3f14fa2eb59c46c8e432a0bf27648f770ad9e3d93aa8e5fd4ee2b8bc&=&format=webp&quality=lossless&width=926&height=927" width="550" alt="huh?">

# Documentación del Motor FNF Genesis Engine

Este documento ofrece una descripción general completa del motor **FNF Genesis**, un motor de juego para *Friday Night Funkin'* basado en navegador y desarrollado con **Phaser.js**. Abarca la arquitectura principal del motor, sus ventajas técnicas y los principales componentes del sistema.

> Para obtener instrucciones de instalación y configuración, consulte **Instalación y configuración**.  
> Para obtener documentación detallada sobre la arquitectura, consulte **Arquitectura**.

---

## Propósito y alcance

**FNF Genesis Engine** es un revolucionario motor de *Friday Night Funkin'* que elimina los requisitos de compilación tradicionales al ejecutarse directamente en navegadores web.  
A diferencia de los motores FNF convencionales que requieren compilación Haxe y una compleja configuración de herramientas, Genesis Engine aprovecha las tecnologías web modernas para ofrecer capacidades de desarrollo e implementación instantáneas.

---

## Descripción general de la arquitectura central

El motor Genesis sigue una arquitectura que prioriza el navegador y está basada en tecnologías web establecidas:

- Arquitectura del motor que prioriza el navegador.

### Ventajas técnicas de Browser-First

<img src="https://i.pinimg.com/originals/05/48/dd/0548dd4afa665874c0c568fe5c189bda.gif" width="150" alt="huh?">

El enfoque centrado en el navegador de Genesis Engine proporciona varias ventajas técnicas clave con respecto a los motores FNF tradicionales:

| Característica         | Motor Génesis                   | Motores tradicionales                   |
|------------------------|----------------------------------|------------------------------------------|
| Compilación            | No requerido                    | Se requiere compilación de Haxe         |
| Tiempo de configuración| ~2 minutos                      | Horas (dependiendo del dispositivo/red) |
| Tamaño de descarga     | ~200 MB                         | ~10 GB+                                  |
| Plataforma             | Navegador + Electron            | Ejecutables nativos                      |
| Ciclo de desarrollo    | Actualización instantánea       | Compilar → Probar → Repetir              |

El motor consigue esto mediante:

- **Ejecución directa de JavaScript**: sin paso de transpilación ni compilación  
- **Integración con Phaser.js**: motor de juego 2D maduro y optimizado  
- **Carga activa de activos**: los cambios se reflejan inmediatamente durante el desarrollo  
- **Implementación multiplataforma**: una única base de código se ejecuta en todas partes

---

## Componentes principales del sistema

<img src="https://i.pinimg.com/originals/d8/84/e5/d884e5f19391c9347693b94125b9d39d.gif" width="150" alt="huh?">

El motor consta de varios sistemas interconectados que trabajan juntos para proporcionar la experiencia FNF completa:

### Arquitectura del sistema central

#### Bucle del juego principal

Actúa `PlayState` como orquestador central y gestiona todos los elementos del juego, incluidos:

- **Animación de personajes**: estados del jugador, enemigo y novia  
- **Nota de generación**: control de mecánicas del ritmo mediante `NotesController`  
- **Sincronización de audio**: manejo del audio y tiempos mediante `AudioManager`  
- **Efectos visuales**: cámara, transiciones y UI  
- **Sistema de salud**: rendimiento del jugador y condiciones de "Game Over"

---

### Sistema de activos y modificaciones

Genesis Engine admite tanto los recursos principales del juego como las modificaciones creadas por el usuario a través de un sistema unificado.

---

## Opciones de desarrollo e implementación

Genesis Engine admite múltiples escenarios de desarrollo e implementación:

### Entorno de desarrollo

- **Desarrollo local**: ejecución directa en el navegador  
- **Recarga activa**: cambios instantáneos de código y activos  
- **Herramientas Node.js**: servidor de desarrollo y utilidades de build

### Opciones de implementación

- **Implementación web**: alojamiento directo mediante archivos estáticos  
- **Electron Packaging**: aplicación de escritorio con integración nativa  
- **Integración con Discord**: presencia enriquecida mediante `@xhayper/discord-rpc`  
- **Almacenamiento local**: persistencia mediante `electron-store`

---

## Integración del sistema de caracteres

El motor incluye un sistema de personajes avanzado que admite animaciones y estados personalizados.

Por ejemplo, el sistema de muerte usa definiciones especializadas:

- **Estados de muerte del novio**: definidos en JSON con animaciones `firstDeath`, `deathLoop`, y `deathConfirm`  
- **Integración de audio**: se reproduce `gameOver.mp3` y `gameOverEnd.mp3` sincronizados  
- **Posicionamiento de cámara**: ajustes automáticos durante la secuencia de muerte

---

## Resumen
 <img src="https://i.pinimg.com/originals/c0/89/ad/c089ad6f6a54c6c5d66e9180ce96b6d3.gif" width="150" alt="huh?">


El motor **FNF Genesis** representa un cambio de paradigma en el desarrollo de motores de *Friday Night Funkin'*, eliminando las barreras de compilación tradicionales y manteniendo compatibilidad total con el ecosistema FNF.

Su arquitectura orientada al navegador, diseño modular y herramientas integrales lo convierten en una opción ideal tanto para prototipado rápido como para implementación final.

La base técnica del motor en **Phaser.js**, junto con sus sistemas de gestión de activos y modificaciones, proporciona a los desarrolladores una **flexibilidad y facilidad de uso sin precedentes** en comparación con los motores tradicionales basados en Haxe.
