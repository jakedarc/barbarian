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

// Add filters to the playlist
const playlist = document.querySelector('.playlist');
if (playlist) {
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
  chatToggleBtn.textContent = 'Hide Chat';
  chatToggleBtn.className = 'custom-control-btn';
  chatToggleBtn.type = 'button';
 
  dateContainer.appendChild(fromLabel);
  dateContainer.appendChild(fromDate);
  dateContainer.appendChild(toLabel);
  dateContainer.appendChild(toDate);
  dateContainer.appendChild(clearBtn);
  dateContainer.appendChild(chatToggleBtn);
 
  // Insert filters before the playlist
  playlist.parentNode.insertBefore(titleFilter, playlist);
  playlist.parentNode.insertBefore(dateContainer, playlist);
 
  // Initialize the date pickers with linkage
  const fromPicker = new SegmentedDatePicker(fromDate);
  const toPicker = new SegmentedDatePicker(toDate);
  
  // Link the pickers so fromPicker can advance to toPicker
  fromPicker.nextPicker = toPicker;
 
  // Helper function to parse date from "Jul 2, 2025" format
  function parseVideoDate(dateStr) {
    return new Date(dateStr);
  }
 
  // Combined filter function
  function filterPlaylist() {
    const titleTerm = titleFilter.value.toLowerCase();
    const fromDateVal = fromPicker.getDate();
    const toDateVal = toPicker.getDate();
   
    const items = playlist.querySelectorAll('.other_video_anchor');
   
    items.forEach(item => {
      const title = item.querySelector('.other_video_title').textContent.toLowerCase();
      const dateStr = item.querySelector('.other_video_view_count_date').textContent;
      const videoDate = parseVideoDate(dateStr);
     
      // Check title filter
      const titleMatch = title.includes(titleTerm);
     
      // Check date range filter
      let dateMatch = true;
      if (fromDateVal && videoDate < fromDateVal) dateMatch = false;
      if (toDateVal && videoDate > toDateVal) dateMatch = false;
     
      // Show item only if both filters pass
      item.style.display = (titleMatch && dateMatch) ? 'block' : 'none';
    });
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
      const isHidden = chatElement.style.display === 'none';
      chatElement.style.display = isHidden ? '' : 'none';
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
}