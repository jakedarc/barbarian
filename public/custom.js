// Segmented Date Picker Class
class SegmentedDatePicker {
  constructor(container, nextPicker = null) {
    this.container = container;
    this.nextPicker = nextPicker;
    this.inputs = {
      month: container.querySelector('.month'),
      day: container.querySelector('.day'),
      year: container.querySelector('.year')
    };
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Auto-advance and validation for each input
    this.inputs.month.addEventListener('input', (e) => {
      this.handleInput(e, 'month', 1, 12, this.inputs.day);
    });
    
    this.inputs.day.addEventListener('input', (e) => {
      this.handleInput(e, 'day', 1, 31, this.inputs.year);
    });
    
    this.inputs.year.addEventListener('input', (e) => {
      this.handleInput(e, 'year', 1900, 2100, null);
    });

    // Backspace handling to move to previous field
    Object.values(this.inputs).forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '') {
          this.focusPrevious(input);
        }
      });
    });
  }

  handleInput(event, type, min, max, nextInput) {
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    
    // Enforce max length
    if (type === 'year' && value.length > 4) {
      value = value.slice(0, 4);
    } else if (type !== 'year' && value.length > 2) {
      value = value.slice(0, 2);
    }
    
    input.value = value;
    
    // Improved auto-advance logic
    if (type === 'month' && value.length >= 1) {
      const monthValue = parseInt(value);
      // Auto-advance if:
      // 1. Two digits entered and valid (01-12)
      // 2. Single digit that can't be part of a valid month (2-9 means 02-09 which are valid, but >1 and length=1, advance except for 1 which could be 10-12)
      if ((value.length === 2 && monthValue >= 1 && monthValue <= 12) ||
          (value.length === 1 && monthValue > 1)) {
        nextInput?.focus();
      }
    } else if (type === 'day' && value.length >= 1) {
      const dayValue = parseInt(value);
      // Auto-advance if:
      // 1. Two digits entered and valid (10-31)
      // 2. Single digit that can't be part of a valid day (4-9 means 04-09 which are all valid, but if >3 and length=1, advance)
      if ((value.length === 2 && dayValue >= 1 && dayValue <= 31) ||
          (value.length === 1 && dayValue > 3)) {
        nextInput?.focus();
      }
    } else if (type === 'year' && value.length === 4) {
      const yearValue = parseInt(value);
      if (yearValue >= 1900 && yearValue <= 2100) {
        // Move to next picker's first field if available
        if (this.nextPicker) {
          this.nextPicker.inputs.month.focus();
        } else {
          input.blur(); // Remove focus when year is complete
        }
      }
    }
  }

  focusPrevious(currentInput) {
    const inputs = Object.values(this.inputs);
    const currentIndex = inputs.indexOf(currentInput);
    if (currentIndex > 0) {
      inputs[currentIndex - 1].focus();
    }
  }

  getDate() {
    const month = this.inputs.month.value.padStart(2, '0');
    const day = this.inputs.day.value.padStart(2, '0');
    const year = this.inputs.year.value;
    
    if (month && day && year && year.length === 4) {
      // Validate the date
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() == year && 
          date.getMonth() == month - 1 && 
          date.getDate() == day) {
        return date;
      }
    }
    return null;
  }

  clear() {
    Object.values(this.inputs).forEach(input => {
      input.value = '';
    });
  }
}

// Add filters and pagination to the playlist
const playlist = document.querySelector('.playlist');
if (playlist) {
  // Pagination state
  let currentPage = 1;
  let itemsPerPage = 25;
  let allItems = [];
  let filteredItems = [];

  // Create title filter
  const titleFilter = document.createElement('input');
  titleFilter.type = 'text';
  titleFilter.className = 'playlist-filter';
  titleFilter.placeholder = 'Filter by title...';
 
  // Create date range filter container
  const dateContainer = document.createElement('div');
  dateContainer.className = 'date-filter-container';
 
  // From date
  const fromLabel = document.createElement('label');
  fromLabel.textContent = 'From:';
  
  const fromDate = document.createElement('div');
  fromDate.className = 'segmented-date';
  fromDate.setAttribute('data-date-group', 'from');
  fromDate.innerHTML = `
    <input type="text" class="month" placeholder="MM" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="day" placeholder="DD" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="year" placeholder="YYYY" maxlength="4">
  `;
 
  // To date
  const toLabel = document.createElement('label');
  toLabel.textContent = 'To:';
  
  const toDate = document.createElement('div');
  toDate.className = 'segmented-date';
  toDate.setAttribute('data-date-group', 'to');
  toDate.innerHTML = `
    <input type="text" class="month" placeholder="MM" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="day" placeholder="DD" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="year" placeholder="YYYY" maxlength="4">
  `;
 
  // Create clear button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.className = 'custom-control-btn';
  clearBtn.type = 'button';
  
  // Create chat toggle button
  const chatToggleBtn = document.createElement('button');
  chatToggleBtn.textContent = 'Show Chat';
  chatToggleBtn.className = 'custom-control-btn';
  chatToggleBtn.type = 'button';
 
  dateContainer.appendChild(fromLabel);
  dateContainer.appendChild(fromDate);
  dateContainer.appendChild(toLabel);
  dateContainer.appendChild(toDate);
  dateContainer.appendChild(clearBtn);
  dateContainer.appendChild(chatToggleBtn);

  // Create pagination container
  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'pagination-container';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '← Previous';
  prevBtn.className = 'custom-control-btn';
  prevBtn.type = 'button';

  const pageInput = document.createElement('input');
  pageInput.type = 'number';
  pageInput.className = 'page-input';
  pageInput.min = '1';
  pageInput.placeholder = '1';

  const pageInfo = document.createElement('span');
  pageInfo.className = 'page-info';

  const itemsPerPageLabel = document.createElement('span');
  itemsPerPageLabel.className = 'page-info';
  itemsPerPageLabel.textContent = 'Items per page:';

  const itemsPerPageInput = document.createElement('select');
  itemsPerPageInput.className = 'items-per-page-input';
  
  // Common pagination options used across the web
  const pageOptions = [10, 25, 50, 100];
  pageOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = option;
    if (option === itemsPerPage) {
      optionElement.selected = true;
    }
    itemsPerPageInput.appendChild(optionElement);
  });

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next →';
  nextBtn.className = 'custom-control-btn';
  nextBtn.type = 'button';

  paginationContainer.appendChild(prevBtn);
  paginationContainer.appendChild(pageInput);
  paginationContainer.appendChild(pageInfo);
  paginationContainer.appendChild(itemsPerPageLabel);
  paginationContainer.appendChild(itemsPerPageInput);
  paginationContainer.appendChild(nextBtn);
 
  // Insert filters before the playlist
  playlist.parentNode.insertBefore(titleFilter, playlist);
  playlist.parentNode.insertBefore(dateContainer, playlist);
  playlist.parentNode.insertBefore(paginationContainer, playlist);
 
  // Initialize the date pickers with linkage
  const fromPicker = new SegmentedDatePicker(fromDate);
  const toPicker = new SegmentedDatePicker(toDate);
  
  // Link the pickers so fromPicker can advance to toPicker
  fromPicker.nextPicker = toPicker;

  // Initialize items array
  function initializeItems() {
    // Try multiple selectors to find the video items
    let items = playlist.querySelectorAll('.other_video_anchor');
    if (items.length === 0) {
      // Try alternative selectors
      items = playlist.querySelectorAll('a[href*="watch"]');
    }
    if (items.length === 0) {
      items = playlist.querySelectorAll('li');
    }
    if (items.length === 0) {
      items = playlist.children;
    }
    
    console.log('Found', items.length, 'playlist items');
    allItems = Array.from(items);
    filteredItems = [...allItems];
  }
 
  // Helper function to parse date from "Jul 2, 2025" format
  function parseVideoDate(dateStr) {
    return new Date(dateStr);
  }

  // Update pagination info and controls
  function updatePaginationControls() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    
    pageInfo.textContent = `of ${totalPages} (${filteredItems.length} videos)`;
    pageInput.max = totalPages;
    pageInput.value = currentPage;
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    // Update button styles based on disabled state
    if (prevBtn.disabled) {
      prevBtn.style.opacity = '0.5';
      prevBtn.style.cursor = 'not-allowed';
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.cursor = 'pointer';
    }
    
    if (nextBtn.disabled) {
      nextBtn.style.opacity = '0.5';
      nextBtn.style.cursor = 'not-allowed';
    } else {
      nextBtn.style.opacity = '1';
      nextBtn.style.cursor = 'pointer';
    }
  }

  // Display items for current page
  function displayCurrentPage() {
    // Hide all items
    allItems.forEach(item => {
      item.style.display = 'none';
    });
    
    // Show items for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToShow = filteredItems.slice(startIndex, endIndex);
    
    itemsToShow.forEach(item => {
      item.style.display = 'block';
    });
    
    updatePaginationControls();
  }
 
  // Combined filter function
  function filterPlaylist() {
    const titleTerm = titleFilter.value.toLowerCase();
    const fromDateVal = fromPicker.getDate();
    const toDateVal = toPicker.getDate();
   
    // Filter items based on criteria
    filteredItems = allItems.filter(item => {
      // Try to find title and date elements with multiple selectors
      let titleElement = item.querySelector('.other_video_title');
      if (!titleElement) {
        titleElement = item.querySelector('h3, h4, .title, [class*="title"]');
      }
      
      let dateElement = item.querySelector('.other_video_view_count_date');
      if (!dateElement) {
        dateElement = item.querySelector('.date, [class*="date"], [class*="time"]');
      }
      
      if (!titleElement) return true; // If we can't find title, show it
      
      const title = titleElement.textContent.toLowerCase();
      
      // Check title filter
      const titleMatch = title.includes(titleTerm);
     
      // Check date range filter
      let dateMatch = true;
      if (dateElement && (fromDateVal || toDateVal)) {
        const dateStr = dateElement.textContent;
        const videoDate = parseVideoDate(dateStr);
        if (fromDateVal && videoDate < fromDateVal) dateMatch = false;
        if (toDateVal && videoDate > toDateVal) dateMatch = false;
      }
     
      return titleMatch && dateMatch;
    });

    // Reset to page 1 when filters change
    currentPage = 1;
    displayCurrentPage();
  }

  // Page navigation functions
  function goToPage(pageNum) {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      currentPage = pageNum;
      displayCurrentPage();
    }
  }

  function goToPrevPage() {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }

  function goToNextPage() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }
 
  // Clear date filters
  function clearDateFilters() {
    fromPicker.clear();
    toPicker.clear();
    filterPlaylist();
  }
  
  // Toggle chat visibility
  function toggleChat() {
    const chatElement = document.querySelector('.chat');
    if (chatElement) {
      const isHidden = chatElement.style.display === 'none' || getComputedStyle(chatElement).display === 'none';
      chatElement.style.display = isHidden ? 'flex' : 'none';
      chatToggleBtn.textContent = isHidden ? 'Hide Chat' : 'Show Chat';
    }
  }
 
  // Add event listeners
  titleFilter.addEventListener('input', filterPlaylist);
  
  // Add listeners to all date inputs for real-time filtering
  fromDate.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', filterPlaylist);
  });
  toDate.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', filterPlaylist);
  });
  
  clearBtn.addEventListener('click', clearDateFilters);
  chatToggleBtn.addEventListener('click', toggleChat);

  // Pagination event listeners
  prevBtn.addEventListener('click', goToPrevPage);
  nextBtn.addEventListener('click', goToNextPage);
  
  pageInput.addEventListener('change', (e) => {
    const pageNum = parseInt(e.target.value);
    goToPage(pageNum);
  });

  pageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(e.target.value);
      goToPage(pageNum);
    }
  });

  // Items per page event listeners
  itemsPerPageInput.addEventListener('change', (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    itemsPerPage = newItemsPerPage;
    currentPage = 1; // Reset to first page
    displayCurrentPage();
  });

  // Initialize everything - wait for content to load
  function initialize() {
    initializeItems();
    if (allItems.length === 0) {
      // Content might not be loaded yet, try again in a moment
      setTimeout(() => {
        initializeItems();
        if (allItems.length > 0) {
          displayCurrentPage();
        }
      }, 1000);
    } else {
      displayCurrentPage();
    }
  }

  // Try to initialize immediately and also after page load
  initialize();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  }
}