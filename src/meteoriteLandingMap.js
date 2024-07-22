// Import utilities
import * as map from './map.js';
import * as dataUtils from '../utils/dataUtils.js';

// Global Parameters
const yearSpan = [1900,2013];
const svg = await d3.select('#map g');
let animationPaused = false;
let currentYear = 0;
let timer;
let projection;

let landings = {
  all: null,
  visible: null,
  invisible: null,
  current: null,
  largest: null,
  smallest: null
}

async function calculateLandings() {
  // Cache all circles
  const allCircles = svg.selectAll("circle");

  // Create an access mapping
  const circleMap = {
    visible: [],
    invisible: [],
    current: []
  };

  // Process each circle and classify them
  allCircles.each(function(d) {
    if (d.properties.year <= currentYear) {
      circleMap.visible.push(this);
      if (d.properties.year == currentYear) {
        circleMap.current.push(this);
      }
    } else {
      circleMap.invisible.push(this);
    }
  });

  // return d3 types
  landings.all = allCircles;
  landings.current = d3.selectAll(circleMap.current);
  landings.visible = d3.selectAll(circleMap.visible);
  landings.invisible = d3.selectAll(circleMap.invisible);
}

// Function to help add points to the map
async function addPoints(year, delay = 500) {
  //TODO await calculateLandings();
  d3.select("#yearDisplay").text(`${year}`);

  // Add all circles with a position-proportional delay
  const circles = landings.all.filter((d, i) => d.properties.year == year);
  circles.transition()
  .delay((d, i) => (i / circles.size()) * delay)
  .duration(700)
  .attr("r", 2)
  .transition()
  .duration(2000)
  .attr("fill", "brown");

  // Update year-step items
  updateAnnotation(year);
  d3.select("#slider").property("value", year);

  if (!animationPaused && year < yearSpan[1]) {
    timer = setTimeout(() => addPoints(year+1), delay);
  }
}

// Function to manage d3 annotations
async function updateAnnotation(year) {
  const visiblePoints = landings.all.filter((d) => d.properties.year <= year);
  
  addSizeAnnotations(visiblePoints);
  addUSAnnotation(visiblePoints);
}

async function addSizeAnnotations(visiblePoints) {
  if (!visiblePoints.empty()) {
    let largestMeteorite = null;
    let smallestMeteorite = null;
  
    visiblePoints.each((d) => {
      if (!largestMeteorite || +d.properties.mass > +largestMeteorite.properties.mass) {
        largestMeteorite = d;
      }
      if (!smallestMeteorite || (+d.properties.mass < +smallestMeteorite.properties.mass && +d.properties.mass > 0)) {
        smallestMeteorite = d;
      }
    });
    
    
  // Purge previous annoatations and rebuild
  svg.selectAll(".annotations").remove();

  // Project coords
  const largestCoords = projection(largestMeteorite.geometry.coordinates);
  const smallestCoords = projection(smallestMeteorite.geometry.coordinates);

  // Build annotations
  const annotations = [
    {
      note: {
        title: "Largest Recorded",
        label: `${largestMeteorite.properties.name}\nMass: ${largestMeteorite.properties.mass}g\n`,
        align: "middle"
      },
      type: d3.annotationsCallout,
      color: ["#000000"],
      x: largestCoords[0],
      y: largestCoords[1],
      dx: 100,
      dy: -50,
      subject: {
        radius: 10,
        radiusPadding: 10
      }
    },
    {
      note: {
        title: "Smallest Recorded",
        label: `${smallestMeteorite.properties.name}\nMass: ${smallestMeteorite.properties.mass}g\n`,
        align: "middle"
      },
      type: d3.annotationsCallout,
      color: ["#000000"],
      x: smallestCoords[0],
      y: smallestCoords[1],
      dx: 100,
      dy: 50,
      subject: {
        radius: 10,
        radiusPadding: 10
      }
    }
  ];

    const makeAnnotations = d3.annotation().annotations(annotations);
    svg.append("g").call(makeAnnotations);

    d3.selectAll('.annotation-note')
    .style('fill', 'black')
    .style('font-weight', 'bold')
    .raise();

    // All yellow impulse effect if we are animating
    if (!animationPaused) {
      landings.all
      .filter((d) => d === largestMeteorite)
      .attr("fill", "yellow")
      .attr("r",6)
      .transition()
      .duration(2000)
      .attr("fill", "brown")
      .attr("r",2);
    }
}
}

//https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json
const countriesGeoJSON = await d3.json('data/gz_2010_us_040_00_500k.json');
const usGeoJSON = {
  type: "FeatureCollection",
  features: countriesGeoJSON.features.filter(feature => feature.properties.NAME !== "Alaska" && feature.properties.NAME !== "Hawaii" && feature.properties.NAME !== "Puerto Rico")
};


async function addUSAnnotation(visiblePoints) {
  // us bounding box https://gist.github.com/graydon/11198540
  const usBB = {
    west: -125.0011,
    east: -66.9326,
    south: 24.9493,
    north: 49.5904
  };
  svg.selectAll(".us-annotation").remove();

  function isPointInPath(x, y) {
    return svg.node().querySelector("path.us-outline").isPointInFill(new DOMPoint(x, y));
  }
  let count = 0;

  function isPointInUSBounds(d) {
    const lat = +d.properties.reclat;
    const long = +d.properties.reclong;
  
    return (lat >= usBB.south && lat <= usBB.north && long >= usBB.west && long <= usBB.east);
  }

  visiblePoints.filter((d) => isPointInUSBounds(d)).each(function() {
    const cx = +d3.select(this).attr("cx");
    const cy = +d3.select(this).attr("cy");
    if (isPointInPath(cx, cy)) {
      //d3.select(this).attr("fill", "green");
      count++;
    }
  });
  d3.select('#map .us-outline-text').text(`US Landings: ${count}`);;

}



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

  // Draw the US outline
  svg.append("path")
    .datum(usGeoJSON)
    .attr("class", "us-outline")
    .attr("d", d3.geoPath().projection(projection))
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", .5);

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
          .html(`${d.properties.name}, ${d.properties.year}<br>Mass: ${d.properties.mass}g`);
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

  // Add label for the count
  d3.select('#map').append("text")
    .attr("class", "us-outline-text")
    .attr("x", 10)
    .attr("y", 60)
    .attr("fill", "blue")
    .attr("font-size", "12px")
    .text(`US Count: 0`);

  d3.select('#map').append("text")
    .attr("id", "yearDisplay")
    .attr("x", 10)
    .attr("y", 40)
    .attr("font-size", "42px")
    .attr("fill", "black");

  await calculateLandings();

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
    if (!animationPaused) {
      clearTimeout(timer);
      animationPaused = true;
      d3.select("#pauseButton").text("Resume");
    }

    // Set the currentYear to the slider selection
    currentYear = parseInt(this.value);
    yearDisplay.text(`${currentYear}`);
    const visiblePoints = landings.all.filter(d => d.properties.year <= currentYear);
    const invisiblePoints = landings.all.filter(d => d.properties.year > currentYear);

    // Update visible circles
    visiblePoints
      .attr("r", 2)
      .attr("fill", "brown");

    // Update invisible circles
    invisiblePoints
      .attr("r", 0)
      .attr("fill", "red");

    d3.select('#map .us-outline-text').text(`US Landings: -`);
    addSizeAnnotations(visiblePoints);
  });
  // register slider end-adjustment trigger
  slider.on("change", function () {
    const visiblePoints = landings.all.filter(d => d.properties.year <= currentYear);
    addUSAnnotation(visiblePoints);
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
