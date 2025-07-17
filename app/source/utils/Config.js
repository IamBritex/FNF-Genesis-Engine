export class Config {
    static get environment() {
        if (window?.electron?.isElectron) {
            return 'electron';
        }
        if (window.location.hostname.includes('github.io')) {
            return 'github';
        }
        return 'web';
    }

    static get basePath() {
        switch (this.environment) {
            case 'electron':
                // Use relative paths for Electron
                return './public/';
            case 'github':
                // Use absolute paths with repo name for GitHub Pages
                return '/FNF-Genesis-Engine/';
            default:
                // Use root-relative paths for web
                return '/';
        }
    }

    static getAssetPath(path) {
        // Remove 'public/' prefix if we're in electron since it's already in basePath
        let cleanPath = path;
        if (this.environment === 'electron' && path.startsWith('public/')) {
            cleanPath = path.substring(7);
        }
        // Remove leading slash if present
        cleanPath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
        return `${this.basePath}${cleanPath}`;
    }

    // Helper method to log current environment and paths
    static debugPaths() {
        console.log('Environment:', this.environment);
        console.log('Base Path:', this.basePath);
        console.log('Sample Asset Path:', this.getAssetPath('public/assets/images/UI/healthBar.png'));
    }
}