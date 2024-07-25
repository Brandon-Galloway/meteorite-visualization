/*

Base Mercator Map Implementation

*/

class MercatorMap {

    // Define a us bounding box (performance)
    usBB = {
        west: -125.0011,
        east: -66.9326,
        south: 24.9493,
        north: 49.5904
    };

    // Construct but don't init (performance)
    constructor(containerId) {
        this.containerId = containerId;
        this.projection = d3.geoMercator();
        this.svg = null;
        this.g = null;
        this.path = d3.geoPath().projection(this.projection);
    }

        
    // Function to check if a point is within US bounds
    isPointInUSBounds(point) {
        const lat = +point.properties.reclat;
        const long = +point.properties.reclong;
        const inUsBounds = (lat >= this.usBB.south && lat <= this.usBB.north && long >= this.usBB.west && long <= this.usBB.east);
        return inUsBounds ? d3.geoContains(this.usGeoJSON, [long, lat]): false;
    }

    // Function to locate the state any given point belongs to (if-applicable)
    locateStateForPoint(point) {
        const lat = +point.properties.reclat;
        const long = +point.properties.reclong;
        const inUsBounds = (lat >= this.usBB.south && lat <= this.usBB.north && long >= this.usBB.west && long <= this.usBB.east);

        if (inUsBounds) {
            for (const feature of this.usGeoJSON.features) {
                if (d3.geoContains(feature, [long, lat])) {
                    return feature.properties.NAME.toLowerCase().replace(/ /g, '-');
                }
            }
        }
        return "Non-US";
    }
    

    // Function to intialize the map
    async initialize() {
        // Fetch data
        const worldData = await d3.json("https://d3js.org/world-110m.v1.json");

        //https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json
        const countriesGeoJSON = await d3.json('data/gz_2010_us_040_00_500k.json');
        this.usGeoJSON = {
            type: "FeatureCollection",
            features: countriesGeoJSON.features.filter(feature => feature.properties.NAME !== "Alaska" && feature.properties.NAME !== "Hawaii" && feature.properties.NAME !== "Puerto Rico")
        };

        // Fit container
        const container = d3.select(`#${this.containerId}`).node();
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Generate D3 Mercator Map
        this.svg = d3.select(`#${this.containerId}`)
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().scaleExtent([1, 8]).on("zoom", this.zoomMap.bind(this)));

        this.g = this.svg.append("g");

        // Draw the world countries
        this.g.append("path")
            .datum(topojson.feature(worldData, worldData.objects.countries))
            .attr("class", "world-outline")
            .attr("d", this.path)
            .attr("fill", "#cccccc")
            .attr("stroke", "#666666");

        // Draw the US outline
        this.g.append("path")
            .datum(this.usGeoJSON)
            .attr("class", "us-outline")
            .attr("d", this.path)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", .25);
        
        // Draw each state outline
        this.g.selectAll(".state-outline")
            .data(this.usGeoJSON.features)
            .enter().append("path")
            .attr("id", d => `us-state-${d.properties.NAME.toLowerCase().replace(/ /g, '-')}`)
            .attr("class", "state-outline")
            .attr("d", this.path)
            .attr("fill", "orange")
            .attr("fill-opacity", 0)
            .attr("stroke", "orange")
            .attr("stroke-width", 0);

        this.scaleMap();
        window.addEventListener('resize', () => {
            console.log('Window resized');
            this.scaleMap();
        });
    }

    // Trigger to scale the map on window resize
    scaleMap() {
        const container = d3.select(`#${this.containerId}`).node();
        const width = container.clientWidth;
        const height = container.clientHeight;
        // Re-project
        this.projection
            .scale(width / 2 / Math.PI)
            .translate([width / 2, height / 2]);

        // Re-draw
        this.svg.attr("width", width).attr("height", height);
        this.g.selectAll("path")
            .attr("d", this.path);

        const proj = this.projection;
        this.g.selectAll("circle").each(function(d) {
            const coords = proj(d.geometry.coordinates);
            d3.select(this)
                .attr("cx", coords[0])
                .attr("cy", coords[1]);
        });
    }

    zoomMap(event) {
        this.g.attr("transform", event.transform);
    }
}

// Export functions for module use
export { MercatorMap };