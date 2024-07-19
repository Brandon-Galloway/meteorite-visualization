// Import utilities
import * as dataUtils from '../utils/dataUtils.js';

// Function to help add points to the map
function addPoints(geoData, projection, points, index, batchSize = 100) {
    if (index >= points.length) return;
    //console.log(`Adding points starting from index: ${index} ${geoData.features[index].properties.year}`);

    const svg = d3.select('#map g');
    const endIndex = Math.min(index + batchSize, points.length);

    // Batch for performance
    for (let i = index; i < endIndex; i++) {
        let coords = projection(points[i].geometry.coordinates);

        // Add a circle for each point
        svg.append("circle")
            .datum(points[i])
            .attr("cx", coords[0])
            .attr("cy", coords[1])
            .attr("r", 0)
            .attr("fill", "red")
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5)
            .transition()
            .duration(500)
            .attr("r", 2)
            .transition()
            .duration(2000)
            .attr("fill", "brown");
    }

    setTimeout(() => addPoints(geoData, projection, points, endIndex, batchSize), 80);
}

// Render the map itself with countries drawn and controls added
async function drawWorldMap() {
    // Fetch data
    const worldData = await d3.json("https://d3js.org/world-110m.v1.json");
    const container = document.getElementById('map');
    // Fit container
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Generate D3 Mercator Map
    const svg = d3.select('#map').attr("width", width).attr("height", height)
    .call(d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed))
    .append("g");
    const projection = d3.geoMercator();
    const path = d3.geoPath().projection(projection);

    // Embedded function to update the map based on container size
    function scaleMap() {
        // Re-fetch container sizing
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.attr("width", width).attr("height", height);
    
        // Re-project
        projection
            .scale(width / 2 / Math.PI)
            .translate([width / 2, height / 2]);
    
        // Re-draw
        svg.selectAll("path")
            .attr("d", path);

        svg.selectAll("circle").each(function(d) {
            let coords = projection(d.geometry.coordinates);
            d3.select(this)
                .attr("cx", coords[0])
                .attr("cy", coords[1]);
        });
    }
    // Initial Scale
    scaleMap();
    
    // Render Countries
    svg.append("path")
        .datum(topojson.feature(worldData, worldData.objects.countries))
        .attr("d", path)
        .attr("fill", "#cccccc")
        .attr("stroke", "#666666");

    // Add listeners/callbacks
    window.addEventListener('resize', () => {
        console.log('Window resized');
        scaleMap();
    });
    function zoomed(event) {
        svg.attr("transform", event.transform);
    }

    return projection;
}

// Function to draw the specific details of the current map
async function drawMap(projection) {
    console.log("Drawing Map");
    const geoData = await dataUtils.loadGeoData();    
    
    geoData.features.sort((a, b) => a.properties.year - b.properties.year);
    
    let topojsonData = topojson.topology({points: geoData});
    let points = topojson.feature(topojsonData, topojsonData.objects.points).features;
    console.log(points.length)
        
    addPoints(geoData, projection, points, 0);

}

// Function entrypoint
let p = await drawWorldMap();
drawMap(p);