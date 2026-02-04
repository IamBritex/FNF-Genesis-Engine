/**
 * @Type Parser
 * Parser de las opciones JSON del usuario basadas en Schema-driven y Data-driven design
 */
export default class UserOptionsManager {
    static preloadAssets(scene) {
        scene.load.json('optionsData', 'public/data/ui/options.json');
    }

    static getOptionsData(scene) {
        return scene.cache.json.get('optionsData');
    }
}