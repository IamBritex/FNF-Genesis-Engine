export function initMobileOrientation() {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobile-orientation-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'none';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = '#ffffff';
    overlay.style.fontFamily = 'sans-serif';
    overlay.style.fontSize = '24px';
    overlay.style.textAlign = 'center';
    overlay.style.cursor = 'pointer';
    
    const icon = document.createElement('div');
    icon.innerHTML = '⟲'; 
    icon.style.fontSize = '50px';
    icon.style.marginBottom = '20px';
    
    const text = document.createElement('div');
    text.innerText = 'Touch here to continue';
    
    overlay.appendChild(icon);
    overlay.appendChild(text);
    document.body.appendChild(overlay);

    const refreshGameScale = () => {
        setTimeout(() => {
            if (window.game) {
                window.game.scale.refresh();
            }
            window.dispatchEvent(new Event('resize'));
        }, 500); 
    };

    const checkOrientation = () => {
        const isPortrait = window.innerHeight > window.innerWidth;
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

        if (isPortrait && !isFullscreen) {
            overlay.style.display = 'flex';
            if (window.game && window.game.sound && window.game.sound.context.state === 'running') {
                window.game.sound.mute = true; 
            }
        } else {
            overlay.style.display = 'none';
            if (window.game && window.game.sound) {
                window.game.sound.mute = false;
            }
            refreshGameScale();
        }
    };

    overlay.addEventListener('click', async () => {
        try {
            const docEl = document.documentElement;
            const requestFull = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
            
            if (requestFull) {
                await requestFull.call(docEl);
            }

            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape').catch(() => {});
            }
            
            refreshGameScale();

        } catch (e) {
            console.warn('Fullscreen/Orientation error:', e);
        }
    });

    window.addEventListener('resize', () => {
        checkOrientation();
        if (window.game && overlay.style.display === 'none') {
             window.game.scale.refresh();
        }
    });
    
    window.addEventListener('orientationchange', checkOrientation);
    document.addEventListener('fullscreenchange', checkOrientation);
    document.addEventListener('webkitfullscreenchange', checkOrientation);
    
    checkOrientation();
}