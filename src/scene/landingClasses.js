// Import utilities
import * as dataUtils from '../utils/dataUtils.js';

class LandingsPie {
    // Construct but don't init (performance)
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${this.containerId}`);
        this.geoData = [];
        this.supperclassCounts = {};
    }

    updateData(state) {
        const filteredData = state ? this.geoData.filter(point => point.state === state) : this.geoData;
        this.supperclassCounts = Array.from(
            d3.rollup(filteredData, i => i.length, m => m.superclass),
            ([superclass, count]) => ({ superclass, count })
        );
        this.supperclassCounts.sort((a, b) => b.count - a.count);
        this.renderPieChart();
    }

    renderPieChart() {
        this.container.selectAll("g").remove();
        const container = this.container.node();
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.svg = d3.select(`#${this.containerId}`)
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

        // Create a legend
        this.legend = this.container.append("g")
        .attr("transform", `translate(${10}, ${20})`);
    
        // Init Pie
        if(this.supperclassCounts.length > 0) {
            const pie = d3.pie().value(m => m.count);
            const color = d3.scaleOrdinal().domain(this.supperclassCounts.map(m => m.superclass)).range(d3.schemeCategory10);
            const arcDef = d3.arc().innerRadius(0).outerRadius(Math.min(width, height) / 2 - 100);
    
            // Render slices
            const slices = this.svg.selectAll('path')
                .data(pie(this.supperclassCounts))
                .enter()
                .append('path')
                .attr('d', arcDef)
                .attr('fill', m => color(m.data.superclass))
                .attr('slice-id', m => m.data.superclass)
                .attr("stroke", "white")
                .style("stroke-width", ".5")
                .style("opacity", 0.7)
                .on('mouseover', function (event, m) {
                    const superclass = m.data.superclass;
                    this.select(superclass);
                }.bind(this))
                .on('mouseout', function (event, m) {
                    const superclass = m.data.superclass;
                    this.deselect(superclass);
                }.bind(this));
    
            const legendItems = this.legend.selectAll('g')
                .data(this.supperclassCounts)
                .enter()
                .append('g')
                .attr("class", "legend-item")
                .attr('legend-id', m => m.superclass)
                .attr("transform", (d, i) => `translate(0, ${i * 20})`);
    
            legendItems
                .append('rect')
                .attr("x", 0)
                .attr("width", 15)
                .attr("height", 15)
                .style("fill", m => color(m.superclass))
                .style("stroke", "none")
                .on('mouseover', function (event, m) {
                    const superclass = m.superclass;
                    this.select(superclass);
                }.bind(this))
                .on('mouseout', function (event, m) {
                    const superclass = m.superclass;
                    this.deselect(superclass);
                }.bind(this));
    
            legendItems.append('text')
                .attr("x", 20)
                .attr("y", 12)
                .text(d => d.superclass)
                .style("font-size", "12px")
                .on('mouseover', function (event, m) {
                    const superclass = m.superclass;
                    this.select(superclass);
                }.bind(this))
                .on('mouseout', function (event, m) {
                    const superclass = m.superclass;
                    this.deselect(superclass);
                }.bind(this));
        } else {
            // If no data is available. Print a message instead
            this.legend.append('text')
            .attr("x", width / 2)
            .attr("y", height / 2)
            .text(d => "No Data Available")
            .style("font-size", "64px")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle");
        }

    }
    
    


    async initialize() {
        const container = this.container.node();
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.geoData = await dataUtils.loadMeteoriteData();
        const usGeoData = await dataUtils.loadUSGeoData();
        this.stateNames = usGeoData.features.map(feature => feature.properties.NAME.toLowerCase().replace(/ /g, '-'));
        this.stateNames.sort((a, b) => a > b);
        const defaultSelectedState = 'illinois';
        // Init to Illinois
        this.updateData(defaultSelectedState);

        // Add controls
        const dropdown = d3.select("#controls")
            .append("select")
            .attr('id', 'stateSelector');

        // Add options to the dropdown
        dropdown.selectAll("option")
            .data(this.stateNames)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d.replace(/\b\w/g, function(char) {
                return char.toUpperCase();
            }))
            .attr('selected', d => d === defaultSelectedState ? true : null);
        
        // Add an event listener to handle change events
        dropdown.on("change", function (event) {
            const selectedState = d3.select("#stateSelector").property("value");
            this.updateData(selectedState);
        }.bind(this));
    }

    // Function to highlight relevant pie-elements
    select(superclass) {
        this.svg.select(`path[slice-id="${superclass}"]`).transition()
            .duration(100)
            .style("opacity", 1)
            .style("stroke-width", "4px");

        const legendItem = this.legend.select(`g[legend-id="${superclass}"]`)
        legendItem.select('rect')
            .style("stroke", "black")
            .style("stroke-width", "2px");

        legendItem.select(`text`)
            .style("font-weight", "bold");
    }

    // Function to revert pie-elements from "select"
    deselect(superclass) {
        this.svg.select(`path[slice-id="${superclass}"]`).transition()
            .duration(100)
            .style("opacity", 0.7)
            .style("stroke-width", "2px");

        const legendItem = this.legend.select(`g[legend-id="${superclass}"]`)
        legendItem.select('rect')
            .style("stroke", "none");

        legendItem.select('text')
            .style("font-weight", "normal");
    }


}

export { LandingsPie };
