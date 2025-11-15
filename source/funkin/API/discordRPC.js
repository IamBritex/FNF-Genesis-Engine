/*
  Discord Rich Presence para FNF Electron Build
  Controla la conexión y actualización de estado con Discord.
*/

const RPC = require('discord-rpc');
const clientId = '1353177735031423028';

RPC.register(clientId);
const rpc = new RPC.Client({ transport: 'ipc' });

function updateActivity(details, state) {
  if (!rpc) return;

  rpc.setActivity({
    details: details || 'Jugando Friday Night Funkin\'',
    // state: state || 'En el menú principal',
    largeImageKey: 'fnf_icon',
    largeImageText: 'Friday Night Funkin\'',
    smallImageText: 'Ready, set, GO!',
    startTimestamp: Date.now(),
    buttons: [
      { label: 'Ver Proyecto', url: 'https://github.com/IamBritex/FNF-Genesis-Engine' },
      { label: 'Unirme al Discord', url: 'https://discord.gg/tuinvitelink' },
    ],
  });
}

rpc.on('ready', () => {
  console.log('[DiscordRPC] Conectado con Discord');
  updateActivity(); // estado inicial
});

rpc.login({ clientId }).catch(console.error);

// 🔹 Exponer funciones globales (sin necesidad de importar)
global.discordRPC = {
  setState: (state) => updateActivity(undefined, state),
  setDetails: (details) => updateActivity(details),
  setActivity: updateActivity
};

module.exports = rpc;

// global.discordRPC.setState("");