class SceneSelector {
  // Construct but don't init (performance)  
  constructor(containerId, numPages, page = 1) {
    this.container = d3.select(`#${containerId}`);
    this.container.attr('class', 'selector');
    this.numPages = numPages;
    this.currentPage = page;
    this.initialize();
  }

  // Function to intialize the SceneSelector
  initialize() {
    // reset
    this.container.selectAll('*').remove();

    // <-
    this.container.append('svg')
      .attr('width', 30)
      .attr('height', 30)
      .append('g')
      .attr('transform', 'translate(15,15)')
      .append('path')
      .attr('d', 'M10,-5L-5,0L10,5Z')
      .attr('fill', '#666666')
      .style('cursor', 'pointer')
      .on('click', () => this.seekPage(-1));

    // append pages
    const pages = this.container.append('div')
      .attr('class', 'page-numbers');

    for (let i = 1; i <= this.numPages; i++) {
      pages.append('span')
        .attr('class', 'page-number')
        .style('margin', '0 5px')
        .style('cursor', 'pointer')
        .text(i)
        .on('click', () => this.goToPage(i))
        .classed('active', i === this.currentPage);
    }

    // ->
    this.container.append('svg')
      .attr('width', 30)
      .attr('height', 30)
      .append('g')
      .attr('transform', 'translate(15,15)')
      .append('path')
      .attr('d', 'M-10,-5L5,0L-10,5Z')
      .attr('fill', '#666666')
      .style('cursor', 'pointer')
      .on('click', () => this.seekPage(1));

  }

  // Seek left or right
  seekPage(dir) {
    const newPage = this.currentPage + dir;
    if (newPage >= 1 && newPage <= this.numPages) {
      this.currentPage = newPage;
      window.location.href = this.currentPage === 1 ? `index.html` : `scene${this.currentPage}.html`;
    }
  }

  // Jump directly to a page
  goToPage(page) {
    if (page >= 1 && page <= this.numPages) {
      this.currentPage = page;
      window.location.href = this.currentPage === 1 ? `index.html` : `scene${this.currentPage}.html`;
    }
  }
}

// Export for module use
export { SceneSelector };