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
    }



    async initialize() {
        const container = this.container.node();
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.geoData = await dataUtils.loadMeteoriteData();
        const countriesGeoJSON = await d3.json('data/gz_2010_us_040_00_500k.json');
        this.usGeoJSON = {
            type: "FeatureCollection",
            features: countriesGeoJSON.features.filter(feature => feature.properties.NAME !== "Alaska" && feature.properties.NAME !== "Hawaii" && feature.properties.NAME !== "Puerto Rico")
        };

        // TODO add a UI selector
        this.updateData('california');


        this.svg = this.container
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        // Init Pie
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

        // Create a legend
        this.legend = this.container.append("g")
            .attr("transform", `translate(${10}, ${20})`);

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
