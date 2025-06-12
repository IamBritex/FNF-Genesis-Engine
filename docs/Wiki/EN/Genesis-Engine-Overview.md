<img src="https://media.discordapp.net/attachments/1380940864842629281/1382145077484458024/108_sin_titulo_20250610184943.png?ex=684b67e9&is=684a1669&hm=cfe295ea3f14fa2eb59c46c8e432a0bf27648f770ad9e3d93aa8e5fd4ee2b8bc&=&format=webp&quality=lossless&width=926&height=927" width="550" alt="huh?">

# FNF Genesis Engine Documentation

This document provides a comprehensive overview of the **FNF Genesis Engine**, a browser-based game engine for *Friday Night Funkin'* developed with **Phaser.js**. It covers the engine’s core architecture, technical advantages, and main system components.

> For installation and setup instructions, see **Installation and Setup**.  
> For detailed documentation on architecture, see **Architecture**.

---

## Purpose and Scope

**FNF Genesis Engine** is a groundbreaking *Friday Night Funkin'* engine that removes traditional build requirements by running directly in web browsers.  
Unlike conventional FNF engines that require Haxe compilation and complex toolchains, Genesis Engine leverages modern web technologies to offer instant development and deployment capabilities.

---

## Core Architecture Overview

The Genesis engine follows a browser-first architecture built on established web technologies:

- Browser-prioritized engine architecture.

### Technical Advantages of Browser-First Approach

<img src="https://i.pinimg.com/originals/05/48/dd/0548dd4afa665874c0c568fe5c189bda.gif" width="250" alt="huh?">

Genesis Engine’s browser-centered approach provides several key technical benefits over traditional FNF engines:

| Feature                 | Genesis Engine                 | Traditional Engines                    |
|------------------------|--------------------------------|----------------------------------------|
| Compilation            | Not required                   | Requires Haxe compilation              |
| Setup Time             | ~2 minutes                     | Hours (depending on device/network)    |
| Download Size          | ~200 MB                        | ~10 GB+                                |
| Platform               | Browser + Electron             | Native executables                     |
| Dev Cycle              | Instant updates                | Compile → Test → Repeat                |

The engine achieves this through:

- **Direct JavaScript execution** – no transpilation or compilation step  
- **Phaser.js integration** – leverages a mature, optimized 2D game engine  
- **Hot asset loading** – changes reflect instantly during development  
- **Cross-platform deployment** – one codebase runs everywhere

---

## Core System Components

<img src="https://i.pinimg.com/originals/d8/84/e5/d884e5f19391c9347693b94125b9d39d.gif" width="250" alt="huh?">

The engine consists of several interconnected systems working together to deliver the full FNF experience:

### Core System Architecture

#### Main Game Loop

`PlayState` acts as the central orchestrator and manages all game elements, including:

- **Character Animation** – handles states for player, opponent, and girlfriend  
- **Note Generation** – controls rhythm mechanics via `NotesController`  
- **Audio Sync** – manages song playback and timing via `AudioManager`  
- **Visual Effects** – coordinates camera movement, transitions, and UI elements  
- **Health System** – tracks player performance and game-over conditions

---

### Asset and Modding System

Genesis Engine supports both core game assets and user-created mods via a unified system.

---

## Development and Deployment Options

Genesis Engine supports multiple development and deployment scenarios:

### Development Environment

- **Local development** – run directly in the browser  
- **Hot reloading** – instant updates to assets and code without compilation  
- **Node.js tools** – dev server and build utilities

### Deployment Options

- **Web deployment** – direct hosting using static files  
- **Electron packaging** – desktop app with native OS integration  
- **Discord integration** – rich presence support via `@xhayper/discord-rpc`  
- **Local storage** – persistent data using `electron-store`

---

## Character System Integration

The engine includes an advanced character system supporting custom animations and states.

For example, the death system uses specialized character definitions:

- **Boyfriend death states** – defined in character JSON with `firstDeath`, `deathLoop`, and `deathConfirm` animations  
- **Audio integration** – plays `gameOver.mp3` and `gameOverEnd.mp3` synchronized with character states  
- **Camera positioning** – auto-adjusts during death sequences

---

## Summary

<img src="https://i.pinimg.com/originals/c0/89/ad/c089ad6f6a54c6c5d66e9180ce96b6d3.gif" width="250" alt="huh?">

The **FNF Genesis Engine** represents a paradigm shift in *Friday Night Funkin'* engine development by removing traditional build barriers and maintaining full compatibility with the FNF ecosystem.

Its browser-oriented architecture, modular design, and comprehensive tools make it ideal for both rapid prototyping and production deployment.

Built on **Phaser.js**, the engine’s innovative asset and modding systems give developers **unprecedented flexibility and ease of use** compared to traditional Haxe-based engines.
