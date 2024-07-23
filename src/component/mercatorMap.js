/*

Base Mercator Map Implementation

*/

class MercatorMap {
    // Construct but don't init (performance)
    constructor(containerId) {
        this.containerId = containerId;
        this.projection = d3.geoMercator();
        this.svg = null;
        this.g = null;
        this.path = d3.geoPath().projection(this.projection);
    }

    // Function to intialize the map
    async initialize() {
        // Fetch data
        const worldData = await d3.json("https://d3js.org/world-110m.v1.json");
        // Fit container
        const container = document.getElementById(this.containerId);
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Generate D3 Mercator Map
        this.svg = d3.select(`#${this.containerId}`)
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().scaleExtent([1, 8]).on("zoom", this.zoomMap.bind(this)));

        this.g = this.svg.append("g");

        this.g.append("path")
            .datum(topojson.feature(worldData, worldData.objects.countries))
            .attr("d", this.path)
            .attr("fill", "#cccccc")
            .attr("stroke", "#666666");

        this.scaleMap();
        window.addEventListener('resize', () => {
            console.log('Window resized');
            this.scaleMap();
        });
    }

    // Trigger to scale the map on window resize
    scaleMap() {
        const container = document.getElementById(this.containerId);
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