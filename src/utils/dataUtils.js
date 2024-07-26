/*

Utility function for data operations

*/

// Define a us bounding box (performance)
const usBB = {
    west: -125.0011,
    east: -66.9326,
    south: 24.9493,
    north: 49.5904
};

// Data cache to make subsequent fetches faster
const dataCache = {};

// Function to load geojson data (See csvToGeoJSON)
async function loadGeoData() {
    return dataCache['worldData'] ? dataCache['worldData'] : await d3.json("data/data.geojson");
}
// Function to load csv data (See csvToGeoJSON)
async function loadMeteoriteData() {
    return dataCache['meteoriteData'] ? dataCache['meteoriteData'] : await d3.csv("data/classified-meteorite-landings.csv");
}
// Function to source data
async function loadOldMeteoriteData() {
    return dataCache['meteoriteData'] ? dataCache['meteoriteData'] : await d3.csv("data/meteorite-landings.csv");
}
// Function to load data 
async function loadUSGeoData() {
    if (!dataCache['usData']) {
        const countriesGeoJSON = await d3.json('data/gz_2010_us_040_00_500k.json');
        dataCache['usData'] = {
            type: "FeatureCollection",
            features: countriesGeoJSON.features.filter(feature => feature.properties.NAME !== "Alaska" && feature.properties.NAME !== "Hawaii" && feature.properties.NAME !== "Puerto Rico")
        }
    }
    return dataCache['usData']; ;
}

// Function to locate the state any given point belongs to (if-applicable)
async function locateStateForPoint(lat,long) {
    const usGeoJSON = await loadUSGeoData();
    const inUsBounds = (lat >= usBB.south && lat <= usBB.north && long >= usBB.west && long <= usBB.east);
    if (inUsBounds) {
        for (const feature of usGeoJSON.features) {
            if (d3.geoContains(feature, [long, lat])) {
                return feature.properties.NAME.toLowerCase().replace(/ /g, '-');
            }
        }
    }
    return "Non-US";
}


// Example function that generates data.geojson
// data.geojson is provided as a static data file to speed up initial load times
async function csvToGeoJSON(downloadFile=false) {
    const csvData = await loadMeteoriteData();
    // Build an array of points
    let features = csvData.map(row => {
        return {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [parseFloat(row.reclong), parseFloat(row.reclat)]
            },
            properties: row
        };
    });

    // Build and return a full feature collection
    const geoJson = {
        type: "FeatureCollection",
        features: features
    };
    if (downloadFile) {
        const blob = new Blob([JSON.stringify(geoJson)], { type: 'text/json;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "data.geojson");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Example function that generates a reverse of class_mappings.json
// class_mappings.json is a manual file created to categorize metiors into broader groups
// For simplicitity it is structured in an opposite manner. This function reverses
async function loadClassMappings() {
    const data = await d3.json('data/class_mappings.json');

    const flipped = {};

    for (const [category, types] of Object.entries(data)) {
        types.forEach(type => {
            if (!flipped[type]) {
                flipped[type] = [];
            }
            flipped[type].push(category);
        });
    }
    return flipped;
}

// Example function to generate classified-meteorite-landings from meteorite-landings
// This adds an additional classification column
async function addDerrivedColumns(downloadFile=false) {
    const classMappings = await loadClassMappings();
    const meteoriteData = await loadOldMeteoriteData();
    console.log(meteoriteData.length)

    // Add a new superclass column
    const failures = new Set();
    const updatedData = [];

    for (const row of meteoriteData) {
        const recclass = row.recclass;
    
        // Build the superclass entry
        const superclass = classMappings[recclass] ? classMappings[recclass] : 'Unknown';
        if (!classMappings[recclass]) {
            failures.add(recclass);
        }
    
        // Build the state entry
        const lat = +row.reclat;
        const long = +row.reclong;
        console.log(lat, long);
        const state = await locateStateForPoint(lat, long);
        console.log(state);
        await new Promise(r => setTimeout(r, 0));
    
        updatedData.push({ ...row, superclass, state });
    }

    const csvContent = d3.csvFormat(updatedData);
    if (downloadFile) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "classified-meteorite-landings.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Export functions for module use
export { loadGeoData, loadMeteoriteData, loadUSGeoData, loadClassMappings };