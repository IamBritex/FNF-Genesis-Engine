import RPC from 'discord-rpc';

const clientId = '1353177735031423028';
const rpc = new RPC.Client({ transport: 'ipc' });

rpc.on('ready', () => {
    rpc.setActivity({
        details: 'lol',
        state: 'Playing FNF Genesis Engine',
        startTimestamp: new Date(),
        largeImageKey: 'fnf_icón',
        largeImageText: 'FNF Icono',
        smallImageKey: 'fnf_logo',
        smallImageText: 'algo random xd',
        buttons: [
            {
                label: 'Open in web',
                url: 'https://iambritex.github.io/FNF-Genesis-Engine/'
            },
            {
                label: 'Download',
                url: 'https://github.com/IamBritex/FNF-Genesis-Engine',
            }
        ]
    });
    console.log('Rich Presence activo');
});

rpc.login({ clientId }).catch(console.error)
