// Import utilities
import * as map from './map.js';
import * as dataUtils from '../utils/dataUtils.js';


// Global Parameters
const svg = await d3.select('#map g');
let animationPaused = false;
let currentIndex = 0;
let points = [];
let timer;
let projection;

// Function to help add points to the map
function addPoints(startIndex, batchSize = 100, delay= 150) {
  // TODO examine type confusion
  startIndex = parseInt(startIndex);
  //batchSize = parseInt(batchSize);
  
  // Break if outside bounds
  if (startIndex >= points.length) return;
  
  // Batch for performance
  const endIndex = Math.min(startIndex + batchSize, points.length);
  for (let i = startIndex; i < endIndex; i++) {
     // Make circle visible with animation for each point
    svg.select(`circle:nth-child(${i + 1})`)
        .transition()
        .delay(Math.floor(startIndex/endIndex * delay))
        .duration(700)
        .attr("r", 2)
        .transition()
        .delay(Math.floor(startIndex/endIndex * delay))
        .duration(2000)
        .attr("fill", "brown");
  }
  // TODO replace with year
  currentIndex = endIndex;
  d3.select("#slider").property("value", currentIndex);

  // TODO updates for performance and year
  if (!animationPaused) {
      timer = setTimeout(() => addPoints(endIndex), delay);
  }
}

// Function to draw the specific details of the current map
async function drawFeatures() {
  // Grab data
  const geoData = await dataUtils.loadGeoData();
  geoData.features.sort((a, b) => a.properties.year - b.properties.year);
  
  // Topojson Translation
  let topojsonData = topojson.topology({points: geoData});
  points = topojson.feature(topojsonData, topojsonData.objects.points).features;

  // Add all points initially, but keep them invisible (performance)
  points.forEach(point => {
      let coords = projection(point.geometry.coordinates);
      svg.append("circle")
        .datum(point)
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
          d3.select(this)
            .attr("fill", "brown")
            .attr("r", 2);
        });
  });

  // Start animation
  updateSlider();
  addPoints(0);

}

function updateSlider() {
  // Init slider
  const slider = d3.select("#slider");
  slider.attr("max", points.length - 1);

  // Register slide trigger
  slider.on("input", function () {
    // Clear points timer and pause  
    clearTimeout(timer);
    animationPaused = true;
    d3.select("#pauseButton").text("Resume");
    
    // Set the currentIndex to the slider selection
    currentIndex = this.value;

    // Update all circles visibility
    const circles = svg.selectAll("circle");
    circles.each(function(d, i) {
      // Grab the current circle
      const circle = d3.select(this);
      if (i <= currentIndex) {
        // Set visible
        let coords = projection(points[i].geometry.coordinates);
        circle.attr("cx", coords[0])
          .attr("cy", coords[1])
          .attr("r", 2)
          .attr("fill", "brown");
        } else {
          // Set invisible
          circle.attr("r", 0).attr("fill", "red");
        }
    });
  });
}


projection = await map.drawWorldMap();

// Register pause/resume button trigger
d3.select("#pauseButton").on("click", function() {
  animationPaused = !animationPaused;
  if (animationPaused) {
      clearTimeout(timer);
      d3.select(this).text("Resume");
  } else {
      d3.select(this).text("Pause");
      addPoints(currentIndex);
  }
});

// Function entrypoint
await drawFeatures();