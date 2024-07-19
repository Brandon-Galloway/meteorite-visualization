/*

Utility function for data operations

*/

// Function to load geojson data (See csvToGeoJSON)
async function loadGeoData() {
    return await d3.json("data/data.geojson");
}

async function loadMeteoriteData() {
    return await d3.csv("data/classified-meteorite-landings.csv");
}

// Example function that generates data.geojson
// data.geojson is provided as a static data file to speed up initial load times
async function csvToGeoJSON() {
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
    return {
        type: "FeatureCollection",
        features: features
    };
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
async function addSuperclassColumn() {
    const classMappings = await loadClassMappings();
    const meteoriteData = await loadMeteoriteData();
    console.log(meteoriteData.length)
    // Add a new superclass column
    const failures = new Set();
    const updatedData = meteoriteData.map(row => {
        const recclass = row.recclass;
        if(!classMappings[recclass]) {
            failures.add(recclass);
        }
        const superclass = classMappings[recclass] ? classMappings[recclass] : 'Unknown';
        return { ...row, superclass };
    });
    console.log(failures);
    const csvContent = d3.csvFormat(updatedData);
}

// Export functions for module use
export { loadGeoData, loadMeteoriteData, csvToGeoJSON, loadClassMappings };