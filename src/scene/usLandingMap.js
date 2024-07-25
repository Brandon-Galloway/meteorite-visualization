// Import utilities
import * as map from '../component/mercatorMap.js';
import * as dataUtils from '../utils/dataUtils.js';

class USLandingsMap {
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

  highlightStatePoints(state) {
    const relevantPoints = this.landings.visible
    .attr("stroke-width", 0)
    .attr("opacity",0.25)
    .filter(function() {
      return d3.select(this).attr("data-us-state") === state;
    })
    .attr('stroke-width',0.25)
    .attr('opacity',.5);

    this.relevantPoints = relevantPoints.size();
    d3.select("#hover-group text")
    .text(this.relevantPoints);
  }

  // Function to add annotation to states
  async addStateAnnotations() {
    // Purge previous annotations and rebuild
    this.svg.selectAll(".annotations").remove();

    // Find the state with the most visible points
    let mostVisibleState = null;
    let maxCount = 0;
    const stateCounts = {};
    
    this.landings.visible.each(function(d) {
        const state = d3.select(this).attr("data-us-state");
        stateCounts[state] = (stateCounts[state] || 0) + 1;
    
        // Check if the current state has the highest count
        if (stateCounts[state] > maxCount) {
            maxCount = stateCounts[state];
            mostVisibleState = state;
        }
    });

    const mostVisibleStateBounds = d3.select(`#us-state-${mostVisibleState}`).node().getBBox();
    const annotation = [
        {
            note: {
                title: `${mostVisibleState.toUpperCase()}`,
                label: `Most Landings (${stateCounts[mostVisibleState]})\n`,
                align: "left"
            },
            type: d3.annotationsCallout,
            color: ["#000000"],
            x: mostVisibleStateBounds.x + mostVisibleStateBounds.width / 2,
            y:  mostVisibleStateBounds.y + mostVisibleStateBounds.height / 2,
            dx: 150,
            dy: -50,
            subject: {
                radius: 10,
                radiusPadding: 10
            }
        }
    ];

    const makeAnnotations = d3.annotation().annotations(annotation);
    this.svg.append("g").call(makeAnnotations);

    d3.selectAll('.annotation-note')
        .style('fill', 'black')
        .style('font-weight', 'bold')
        .raise();

    // Highlight the state if we are animating
    if (!this.animationPaused) {
          // Toggle css with fade
          d3.select(`#us-state-${mostVisibleState}`)
          .classed('highlighted-state', true)
          .classed('default-state', false)
          .transition()
          .duration(1000)
          .on('end', function() {
              d3.select(this)
                  .classed('highlighted-state', false)
                  .classed('default-state', true)
          });
    }
}



  selectedState = undefined;
  relevantPoints = 0;
  // Function to intialize the map
  async initialize() {
    const baseMap = new map.MercatorMap(this.containerId);
    await baseMap.initialize();
    this.projection = baseMap.projection;
    this.svg = baseMap.g;
      
    // TODO attempt to cleanup this mess!
    this.stateNames = baseMap.usGeoJSON.features.map(feature => feature.properties.NAME);
    this.svg.selectAll(".state-outline")
    .on("mouseover", function(event, d) {
      // Parse the selected state
      this.selectedState = d.properties.NAME.toLowerCase().replace(/ /g, '-');
      // Highlight the selected state
      d3.select(`#us-state-${this.selectedState}`)
        .classed('highlighted-state', true)
        .classed('default-state', false)
      // Run point highlights
      this.highlightStatePoints(this.selectedState);

      // Create Tooltip for count of points
      const bbox = d3.select(`#us-state-${this.selectedState}`).node().getBBox();
      const hoverGroup = this.svg.append("g")
      .attr("id", "hover-group");

      hoverGroup.append("circle")
        .attr("pointer-events", "none")
        .attr("cx", bbox.x + bbox.width / 2)
        .attr("cy", bbox.y + bbox.height / 2)
        .attr("r", 4)
        .attr("fill", "red")
        .attr("stroke", "black")
        .attr("stroke-width", .5);

      hoverGroup.append("text")
        .attr("pointer-events", "none")
        .attr("x", bbox.x + bbox.width / 2)
        .attr("y", bbox.y + bbox.height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "5px")
        .attr("font-weight", "bold")
        .attr("fill", "black")
        .text(this.relevantPoints);
    }.bind(this))
    .on("mouseout", function(event, d) {
      // Null selected state and parse state
      this.selectedState = undefined;
      const state = d.properties.NAME.toLowerCase().replace(/ /g, '-');
      // Revert the deselected state
      d3.select(`#us-state-${state}`)
        .classed('highlighted-state', false)
        .classed('default-state', true)
      // Run point highlights
      this.highlightStatePoints(this.selectedState);
      // Destroy tooltip
      d3.select("#hover-group").remove();
    }.bind(this));


    this.slider = d3.select("#slider");
    //this.yearDisplay = d3.select("#yearDisplay");

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
    points = points.slice(yearToIndex[this.yearSpan[0]],yearToIndex[2101]-1)
    
    // Add all points initially, but keep them invisible (performance)
    points.forEach(point => {
      if (baseMap.isPointInUSBounds(point)) {
        let coords = this.projection(point.geometry.coordinates);
        this.svg.append("circle")
          .datum(point)
          .attr("id","id-"+point.properties.id)
          .attr("cx", coords[0])
          .attr("cy", coords[1])
          .attr("r", 0)
          .attr("fill", "red")
          .attr("stroke", "#000")
          .attr("opacity",0.25)
          .attr("stroke-width", 0)
          .attr("pointer-events", "none")
          .attr("data-us-state", baseMap.locateStateForPoint(point));
      }
    });
  
    // Add label for the count
    this.container.append("text")
      .attr("class", "us-outline-text")
      .attr("x", 10)
      .attr("y", 60)
      .attr("fill", "blue")
      .attr("font-size", "12px")
      .text(`US Count: 0`);
      
      this.yearDisplay = this.container.append("text")
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
    // this.slider.on("change", this.onSliderRelease.bind(this));
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

  async addPoints(year, delay = 250) {
    this.currentYear = year;
    await this.calculateLandings(year);
    d3.select("#yearDisplay").text(`${year}`);
  
    this.landings.current.transition()
    .delay((d, i) => (i / this.landings.current.size()) * delay)
    .duration(700)
    .attr("r", 1)
    .transition()
    .duration(2000)
    .attr("fill", "brown");
  
    // Update year-step items
    await this.addStateAnnotation();
    d3.select("#slider").property("value", year);
    this.highlightStatePoints(this.selectedState);
    this.addStateAnnotations();
  
    if (!this.animationPaused && year < this.yearSpan[1]) {
      this.timer = setTimeout(() => this.addPoints(year+1), delay);
    }
  }

  async addStateAnnotation() {
    this.svg.selectAll(".us-annotation").remove();
    this.container.select('.us-outline-text').text(`US Landings: ${this.landings.visible.size()}`);
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
      .attr("r", 1)
      .attr("fill", "brown");

    // Update invisible circles
    this.landings.invisible
      .attr("r", 0)
      .attr("fill", "red");
    await this.addStateAnnotation();

  }

  // async onSliderRelease() {
  //   this.currentYear = parseInt(this.slider.property("value"));
  //   await this.calculateLandings(this.currentYear);
  //   this.yearDisplay.text(`${this.currentYear}`);
  // }

}

export { USLandingsMap };