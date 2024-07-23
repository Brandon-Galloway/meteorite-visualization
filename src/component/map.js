/*

Base Mercator Map Implementation

*/

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
    .call(d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed));

    const g = svg.select("g");
    const projection = d3.geoMercator();
    const path = d3.geoPath().projection(projection);

    // Embedded function to update the map based on container size
    function scaleMap() {
        // Re-fetch container sizing
        const width = container.clientWidth;
        const height = container.clientHeight;    
        
        // Re-project
        projection
            .scale(width / 2 / Math.PI)
            .translate([width / 2, height / 2]);
    
        // Re-draw
        g.attr("width", width).attr("height", height);
        g.selectAll("path")
            .attr("d", path);

        g.selectAll("circle").each(function(d) {
        const coords = projection(d.geometry.coordinates);
        d3.select(this)
            .attr("cx", coords[0])
            .attr("cy", coords[1]);
        });
    }
    // Initial Scale
    scaleMap();
    
    // Render Countries
    g.append("path")
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
        g.attr("transform", event.transform);
    }

    return projection;
}

// Export functions for module use
export { drawWorldMap };