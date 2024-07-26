import {LandingsMap} from './scene/landingMap.js';
import { USLandingsMap } from './scene/usLandingMap.js';
import {SceneSelector} from './component/sceneSelector.js';
import { LandingsPie } from './scene/landingClasses.js';

// Orchestrator to handle scene transitions
// TODO better way to handle switchout...currently a lot of dupe
const pageSelector = new SceneSelector("selector", 5, scene);
switch (scene) {
    // Intro Page
    case 1:
        break;
    // Viz 1: Landings over the world
    case 2:
        const landingsMap = new LandingsMap("map");
        landingsMap.initialize();
        break;
    // Viz 2: Landings throughout the US
    case 3:
        const usMap = new USLandingsMap("map");
        usMap.initialize();
        break;
    // Viz 3: Classifications of landings by US-State
    case 4:
        const pie = new LandingsPie("map");
        pie.initialize();
        break;
    case 5:
        break;
    default:
        console.log("No render found");
        break;
}