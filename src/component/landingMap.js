// Import utilities
import * as map from './mercatorMap.js';
import * as dataUtils from '../utils/dataUtils.js';

class LandingsMap {
  // Construct but don't init (performance)
  constructor(containerId) {
    this.containerId = containerId;
    this.container = d3.select(`#${this.containerId}`);
    this.yearSpan = [1900,2013];
    this.animationPaused = false;
    this.currentYear = 0;
    this.timer;
 
    this.landings = {
      all: null,
      visible: null,
      invisible: null,
      current: null,
      largest: null,
      smallest: null
    }
  }

  isPointInPath(x, y) {
    return this.svg.node().querySelector("path.us-outline").isPointInFill(new DOMPoint(x, y));
  }

  // Function to intialize the map
  async initialize() {
    const baseMap = new map.MercatorMap(this.containerId);
    await baseMap.initialize();
    this.projection = baseMap.projection;
    this.svg = baseMap.g;

    this.slider = d3.select("#slider");
    //this.yearDisplay = d3.select("#yearDisplay");

    //https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json
    const countriesGeoJSON = await d3.json('data/gz_2010_us_040_00_500k.json');
    const usGeoJSON = {
      type: "FeatureCollection",
      features: countriesGeoJSON.features.filter(feature => feature.properties.NAME !== "Alaska" && feature.properties.NAME !== "Hawaii" && feature.properties.NAME !== "Puerto Rico")
    };

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
    this.svg.append("path")
      .datum(usGeoJSON)
      .attr("class", "us-outline")
      .attr("d", d3.geoPath().projection(this.projection))
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", .5);
  
    // Topojson Translation
    let topojsonData = topojson.topology({points: geoData});
    let points = topojson.feature(topojsonData, topojsonData.objects.points).features;
    // slice to 1900 - 2013
    points = points.slice(yearToIndex[this.yearSpan[0]],yearToIndex[2101]-1)
    
      // Define US bounding box
      const usBB = {
        west: -125.0011,
        east: -66.9326,
        south: 24.9493,
        north: 49.5904
      };
    
      // Function to check if a point is within US bounds
      function isPointInUSBounds(d) {
        const lat = +d.properties.reclat;
        const long = +d.properties.reclong;
        return (lat >= usBB.south && lat <= usBB.north && long >= usBB.west && long <= usBB.east);
      }
  

    
    
    // Add all points initially, but keep them invisible (performance)
    points.forEach(point => {
  
      let coords = this.projection(point.geometry.coordinates);
      this.svg.append("circle")
        .datum(point)
        .attr("id","id-"+point.properties.id)
        .attr("cx", coords[0])
        .attr("cy", coords[1])
        .attr("r", 0)
        .attr("fill", "red")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5)
        .attr("data-us-bound", isPointInUSBounds(point) && this.isPointInPath(coords[0],coords[1]))
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
    this.container.append("text")
      .attr("class", "us-outline-text")
      .attr("x", 10)
      .attr("y", 60)
      .attr("fill", "blue")
      .attr("font-size", "12px")
      .text(`US Count: 0`);
  
      this.yearDisplay = d3.select('#map').append("text")
      .attr("id", "yearDisplay")
      .attr("x", 10)
      .attr("y", 40)
      .attr("font-size", "42px")
      .attr("fill", "black");
  
    this.landings.all = this.svg.selectAll("circle");
  
    // Start animation
    await this.addPoints(this.yearSpan[0]);

    // Create the pause button control
    const button = d3.select("#controls").insert("button", "input")
    .attr('id','pauseButton')
    .text("Pause");

    button.on("click", function() {
      this.animationPaused = !this.animationPaused;
      if (this.animationPaused) {
        clearTimeout(this.timer);
        d3.select("#pauseButton").text("Resume");
      } else {
        d3.select("#pauseButton").text("Pause");
        this.addPoints(this.currentYear);
      }
    }.bind(this));

    // Create the slider control
    this.slider = d3.select("#controls").append("input")
      .attr("type", "range")
      .attr("id", "slider")
      .attr("min", 1900)
      .attr("max", 2013)
      .attr("value", 1900)
      .attr("step", 1);

    // Register slide trigger
    this.slider.on("input", this.onSliderUpdate.bind(this));
    // register slider end-adjustment trigger
    this.slider.on("change", this.onSliderRelease.bind(this));
    this.yearDisplay.text(this.currentYear);
  }

  async calculateLandings(year) {
    // Create an access mapping
    const circleMap = {
      visible: [],
      invisible: [],
      current: [],
      largest: null,
      smallest: null
    };
  
    // Process each circle and classify them
    this.landings.all.each(function(d) {
      if (d.properties.year <= year) {
        // Circle is visible
        circleMap.visible.push(this);
        // Calculate current subset for performance
        if (+d.properties.year == year) {
          circleMap.current.push(this);
        }
        // Check largest and smallest
        if (!circleMap.largest || +d.properties.mass > +circleMap.largest.properties.mass) {
          circleMap.largest = d;
        }
        if (!circleMap.smallest || (+d.properties.mass < +circleMap.smallest.properties.mass && +d.properties.mass > 0)) {
          circleMap.smallest = d;
        }
      } else {
        circleMap.invisible.push(this);
      }
    });
    // return d3 types
    this.landings = {
      all: this.landings.all,
      visible: d3.selectAll(circleMap.visible),
      invisible: d3.selectAll(circleMap.invisible),
      current: d3.selectAll(circleMap.current),
      largest: circleMap.largest,
      smallest: circleMap.smallest
    }
  }

  async addPoints(year, delay = 1000) {
    this.currentYear = year;
    await this.calculateLandings(year);
    d3.select("#yearDisplay").text(`${year}`);
  
    this.landings.current.transition()
    .delay((d, i) => (i / this.landings.current.size()) * delay)
    .duration(700)
    .attr("r", 2)
    .transition()
    .duration(2000)
    .attr("fill", "brown");
  
    // Update year-step items
    await this.addSizeAnnotations();
    this.addUSAnnotation();
    d3.select("#slider").property("value", year);
  
    if (!this.animationPaused && year < this.yearSpan[1]) {
      this.timer = setTimeout(() => this.addPoints(year+1), delay);
    }
  }

  async addSizeAnnotations() {      
    // Purge previous annoatations and rebuild
    this.svg.selectAll(".annotations").remove();
  
    // Project coords
    const largestCoords = this.projection(this.landings.largest.geometry.coordinates);
    const smallestCoords = this.projection(this.landings.smallest.geometry.coordinates);
  
    // Build annotations
    const annotations = [
      {
        note: {
          title: "Largest Recorded",
          label: `${this.landings.largest.properties.name}\nMass: ${this.landings.largest.properties.mass}g\n`,
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
          label: `${this.landings.smallest.properties.name}\nMass: ${this.landings.smallest.properties.mass}g\n`,
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
      this.svg.append("g").call(makeAnnotations);
  
      d3.selectAll('.annotation-note')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .raise();
  
      // All yellow impulse effect if we are animating
      if (!this.animationPaused && +this.currentYear === +this.landings.largest.properties.year) {
        d3.select(`#id-${this.landings.largest.properties.id}`)
        .attr("fill", "yellow")
        .attr("r", 6)
        .transition()
        .duration(2000)
        .attr("fill", "brown")
        .attr("r", 2);
      }
  }

  async addUSAnnotation() {
    this.svg.selectAll(".us-annotation").remove();
  
    const count = this.landings.visible
    .filter(function() {
      return d3.select(this).attr("data-us-bound") === "true";
    })
    .size();
  
    d3.select('#map .us-outline-text').text(`US Landings: ${count}`);
  }

  async onSliderUpdate() {
      if (!this.animationPaused) {
        clearTimeout(this.timer);
        this.animationPaused = true;
        d3.select("#pauseButton").text("Resume");
    }
    this.currentYear = parseInt(this.slider.property("value"));
    this.yearDisplay.text(`${this.currentYear}`);
    await this.calculateLandings(this.currentYear);

    // Update visible circles
    this.landings.visible
      .attr("r", 2)
      .attr("fill", "brown");

    // Update invisible circles
    this.landings.invisible
      .attr("r", 0)
      .attr("fill", "red");

    await this.addSizeAnnotations();
  }

  async onSliderRelease() {
    this.currentYear = parseInt(this.slider.property("value"));
    await this.calculateLandings(this.currentYear);
    await this.addUSAnnotation();
    this.yearDisplay.text(`${this.currentYear}`);
  }

}

export { LandingsMap };