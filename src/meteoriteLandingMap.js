// Import utilities
import * as map from './map.js';
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
            .on("mouseover", function(event, d) {
                // Modify Tooltip Element
                d3.select("#tooltip")
                  .style("left", (event.pageX + 5) + "px")
                  .style("top", (event.pageY + 5) + "px")
                  .select("span")
                  .text(`${d.properties.name}, ${d.properties.year}`);
                // Set Visible
                d3.select("#tooltip").classed("hidden", false);
                // Highlight black
                d3.select(this)
                  .attr("fill", "black")
                  .attr("r", 6);
            })
            .on("mouseout", function() {
                // Set Invisible
                d3.select("#tooltip").classed("hidden", true);

                // Reset point to defaults
                d3.select(this)
                  .attr("fill", "brown")
                  .attr("r", 2);
            })
            .transition()
            .duration(500)
            .attr("r", 2)
            .transition()
            .duration(2000)
            .attr("fill", "brown");
    }

    setTimeout(() => addPoints(geoData, projection, points, endIndex, batchSize), 80);
}

// Function to draw the specific details of the current map
async function drawFeatures(projection) {
    console.log("Drawing Map");
    const geoData = await dataUtils.loadGeoData();    
    
    geoData.features.sort((a, b) => a.properties.year - b.properties.year);
    
    let topojsonData = topojson.topology({points: geoData});
    let points = topojson.feature(topojsonData, topojsonData.objects.points).features;
    console.log(points.length)
        
    addPoints(geoData, projection, points, 0);

}


// Function entrypoint
let p = await map.drawWorldMap();
drawFeatures(p);

