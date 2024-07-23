import {LandingsMap} from './component/landingMap.js';
import { MercatorMap } from './component/mercatorMap.js';
import {SceneSelector} from './component/sceneSelector.js';

// Orchestrator to handle scene transitions
// TODO better way to handle switchout...currently a lot of dupe
const pageSelector = new SceneSelector("selector", 5, scene);
switch (scene) {
    case 1:
        const landingsMap = new LandingsMap("map");
        await landingsMap.initialize();
        break;
    case 2:
        const map = new MercatorMap("map");
        map.initialize();
}



