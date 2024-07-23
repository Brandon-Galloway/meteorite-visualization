class PageSelector {
    constructor(container, numPages, page = 1) {
      this.container = d3.select(container);
      this.numPages = numPages;
      this.currentPage = page;
      this.createSelector();
    }
  
    createSelector() {
        const container = this.container;
        const numPages = this.numPages;
        const currentPage = this.currentPage;
      
        // Clear any existing content
        container.selectAll('*').remove();
      
        // Append container for arrows and page numbers
        const mainContainer = container.append('div')
          .attr('class', 'selector-container');
      
        // Append left arrow
        mainContainer.append('svg')
          .attr('width', 30)
          .attr('height', 30)
          .append('g')
          .attr('transform', 'translate(15,15)')
          .append('path')
          .attr('d', 'M10,-5L-5,0L10,5Z')
          .attr('fill', '#333')
          .style('cursor', 'pointer')
          .on('click', () => this.navigate(-1)); // Move to previous page
      
        // Append page numbers
        const pages = mainContainer.append('div')
          .attr('class', 'page-numbers');
      
        for (let i = 1; i <= numPages; i++) {
          pages.append('span')
            .attr('class', 'page-number')
            .style('margin', '0 5px')
            .style('cursor', 'pointer')
            .text(i)
            .on('click', () => this.goToPage(i)) // Directly go to specific page
            .classed('active', i === currentPage);
        }
      
        // Append right arrow
        mainContainer.append('svg')
          .attr('width', 30)
          .attr('height', 30)
          .append('g')
          .attr('transform', 'translate(15,15)')
          .append('path')
          .attr('d', 'M-10,-5L5,0L-10,5Z')
          .attr('fill', '#333')
          .style('cursor', 'pointer')
          .on('click', () => this.navigate(1)); // Move to next page
      
        this.update();
      }
  
    update() {
      const container = this.container;
      container.selectAll('.page-number')
        .classed('active', (d, i) => i + 1 === this.currentPage);
    }
  
    navigate(direction) {
        console.log("Navigate",direction);
      const newPage = this.currentPage + direction;
      if (newPage >= 1 && newPage <= this.numPages) {
        this.currentPage = newPage;
        this.update();
      }
    }
  
    goToPage(page) {
      if (page >= 1 && page <= this.numPages) {
        this.currentPage = page;
        this.update();
      }
    }
  }
  

// Usage example
const pageSelector = new PageSelector('#selector-container', 5, 1);
