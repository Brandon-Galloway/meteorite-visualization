// Import utilities
import * as map from './map.js';
import * as dataUtils from '../utils/dataUtils.js';

// Global Parameters
const svg = await d3.select('#map g');
let animationPaused = false;
let currentYear = 0;
let timer;
let projection;
const yearSpan = [1900,2013]

// Function to help add points to the map
function addPoints(year, delay = 500) {
  d3.select("#yearDisplay").text(`${year}`);

  const circles = svg.selectAll("circle").filter((d, i) => d.properties.year == year);
  circles.transition()
  .delay((d, i) => (i / circles.size()) * delay)
  .duration(700)
  .attr("r", 2)
  .transition()
  .duration(2000)
  .attr("fill", "brown");

  d3.select("#slider").property("value", year);

  if (!animationPaused && year < yearSpan[1]) {
    timer = setTimeout(() => addPoints(year+1), delay);
  }
}

// Function to draw the specific details of the current map
async function drawFeatures() {
  // Grab data
  const geoData = await dataUtils.loadGeoData();
  geoData.features.sort((a, b) => a.properties.year - b.properties.year);
  
  //Create year-to-index mapping
  let yearToIndex = {};
  for (let index = geoData.features.length - 1; index >= 0; index--) {
    const year = geoData.features[index].properties.year;
    if (!(year in yearToIndex)) {
      yearToIndex[year] = index;
    }
  }

  // Topojson Translation
  let topojsonData = topojson.topology({points: geoData});
  let points = topojson.feature(topojsonData, topojsonData.objects.points).features;
  // slice to 1900 - 2013
  points = points.slice(yearToIndex[yearSpan[0]],yearToIndex[2101]-1)
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

  // Add text element for displaying current year
  svg.append("text")
    .attr("id", "yearDisplay")
    .attr("x", 10)
    .attr("y", 40)
    .attr("font-size", "42px")
    .attr("fill", "black");

  // Start animation
  updateSlider();
  addPoints(yearSpan[0]);

}

function updateSlider() {
  // Init slider
  const slider = d3.select("#slider");
  const yearDisplay = d3.select("#yearDisplay");

  // Register slide trigger
  slider.on("input", function () {
    // Clear points timer and pause  
    clearTimeout(timer);
    animationPaused = true;
    d3.select("#pauseButton").text("Resume");
    
    // Set the currentYear to the slider selection
    currentYear = parseInt(this.value);

    // Update year display
    yearDisplay.text(`${currentYear}`);

    // Update all circles visibility (performance)
    const circles = svg.selectAll("circle");

    circles.attr("r", function(d) {
      return d.properties.year <= currentYear ? 2 : 0;
    }).attr("fill", function(d) {
      return d.properties.year <= currentYear ? "brown" : "red";
    });
  });

  yearDisplay.text(`Year: ${slider.property("value")}`);
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
    addPoints(currentYear);
  }
});

// Function entrypoint
await drawFeatures();
