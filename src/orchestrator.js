import {LandingsMap} from './scene/landingMap.js';
import { MercatorMap } from './component/mercatorMap.js';
import { USLandingsMap } from './scene/usLandingMap.js';
import {SceneSelector} from './component/sceneSelector.js';
import { LandingsPie } from './scene/landingClasses.js';

// Orchestrator to handle scene transitions
// TODO better way to handle switchout...currently a lot of dupe
const pageSelector = new SceneSelector("selector", 4, scene);
switch (scene) {
    case 1:
        const landingsMap = new LandingsMap("map");
        landingsMap.initialize();
        break;
    case 2:
        const usMap = new USLandingsMap("map");
        usMap.initialize();
        break;
    case 3:
        const pie = new LandingsPie("map");
        pie.initialize();
        break;
    default:
        console.log("No render found");
        break;
}