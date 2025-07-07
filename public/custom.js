// Video Position Saving Functionality
const VIDEO_POSITION_CONFIG = {
  saveInterval: 10, // Save position every 10 seconds
  minSaveTime: 30, // Don't save positions for first 30 seconds
  expireDays: 30, // Clear saved positions older than 30 days
  resumeThreshold: 60 // Only resume if more than 60 seconds from start
};

// Global flag to prevent multiple setups
const setupTracker = new Set();

// Get video ID from current URL
function getVideoId() {
  const path = window.location.pathname;
  const match = path.match(/\/(\d+)$/);
  return match ? match[1] : null;
}

// Clean up old saved positions
function cleanupOldPositions() {
  const now = Date.now();
  const expireTime = VIDEO_POSITION_CONFIG.expireDays * 24 * 60 * 60 * 1000;
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('video_position_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.timestamp && (now - data.timestamp > expireTime)) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
  });
}

// Save video position
function saveVideoPosition(videoId, currentTime, duration) {
  if (currentTime < VIDEO_POSITION_CONFIG.minSaveTime) return;
  if (currentTime > duration - 30) return; // Don't save if near the end
  
  const positionData = {
    time: currentTime,
    duration: duration,
    timestamp: Date.now()
  };
  
  localStorage.setItem(`video_position_${videoId}`, JSON.stringify(positionData));
}

// Get saved video position
function getSavedVideoPosition(videoId) {
  try {
    const data = localStorage.getItem(`video_position_${videoId}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Clear saved position for a video
function clearVideoPosition(videoId) {
  localStorage.removeItem(`video_position_${videoId}`);
}

// Format time for display
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Auto-resume video without prompt
function autoResumeVideo(player, savedTime) {
  console.log(`Auto-resuming video from ${formatTime(savedTime)}`);
  
  const onSeeked = () => {
    console.log('Resume completed');
    player.isResuming = false;
    player.off('seeked', onSeeked);
  };
  
  player.isResuming = true;
  player.on('seeked', onSeeked);
  player.currentTime(savedTime);
}

// Initialize video position saving
function initializeVideoPositionSaving() {
  const videoId = getVideoId();
  if (!videoId) return;
  
  cleanupOldPositions();
  
  // Try multiple methods to find the Video.js player
  function findPlayer() {
    // Method 1: Check global videojs players
    if (window.videojs) {
      const players = window.videojs.getPlayers();
      const playerInstance = players && Object.values(players)[0];
      if (playerInstance && playerInstance.readyState() > 0) {
        return playerInstance;
      }
    }
    
    // Method 2: Check DOM for video element with player
    const videoElement = document.querySelector('video.vjs-tech');
    if (videoElement && videoElement.player) {
      return videoElement.player;
    }
    
    // Method 3: Find player div and get videojs instance
    if (window.videojs) {
      const playerDiv = document.querySelector('.video-js');
      if (playerDiv && playerDiv.id) {
        const player = window.videojs(playerDiv.id);
        if (player) return player;
      }
    }
    
    return null;
  }
  
  // Try to find and setup player
  function attemptSetup() {
    const player = findPlayer();
    if (player) {
      setupVideoPositionSaving(player, videoId);
    } else {
      setTimeout(attemptSetup, 500);
    }
  }
  
  attemptSetup();
  setTimeout(attemptSetup, 1000);
  setTimeout(attemptSetup, 3000);
}

// Setup position saving for a player instance
function setupVideoPositionSaving(player, videoId) {
  const setupKey = `${videoId}_${player.id() || 'default'}`;
  
  if (setupTracker.has(setupKey)) {
    console.log('Video position saving already set up for:', setupKey);
    return;
  }
  
  setupTracker.add(setupKey);
  console.log('Setting up video position saving for video:', videoId);
  
  let saveTimer;
  let hasResumed = false;
  let shouldResume = false;
  
  // Save position periodically
  const savePosition = () => {
    if (player.isResuming) return;
    
    const currentTime = player.currentTime();
    const duration = player.duration();
    
    if (currentTime && duration && !isNaN(currentTime) && !isNaN(duration)) {
      saveVideoPosition(videoId, currentTime, duration);
    }
  };
  
  // Start/stop periodic saving
  const startSaving = () => {
    if (saveTimer) clearInterval(saveTimer);
    saveTimer = setInterval(savePosition, VIDEO_POSITION_CONFIG.saveInterval * 1000);
  };
  
  const stopSaving = () => {
    if (saveTimer) {
      clearInterval(saveTimer);
      saveTimer = null;
    }
  };
  
  // Check for saved position and auto-resume
  const checkSavedPosition = () => {
    if (hasResumed || player.isResuming) return;
    
    const savedPosition = getSavedVideoPosition(videoId);
    if (savedPosition && savedPosition.time > VIDEO_POSITION_CONFIG.resumeThreshold) {
      shouldResume = true;
      hasResumed = true;
      autoResumeVideo(player, savedPosition.time);
    }
  };
  
  // Event listeners
  player.on('loadedmetadata', () => {
    setTimeout(checkSavedPosition, 100);
  });
  
  player.on('play', () => {
    if (shouldResume && !hasResumed) {
      player.pause();
      checkSavedPosition();
      return;
    }
    
    if (!player.isResuming) {
      startSaving();
    }
  });
  
  player.on('pause', () => {
    if (!player.isResuming) {
      savePosition();
    }
  });
  
  player.on('seeked', () => {
    if (!player.isResuming) {
      savePosition();
    }
  });
  
  player.on('ended', () => {
    stopSaving();
    clearVideoPosition(videoId);
  });
  
  window.addEventListener('beforeunload', savePosition);
  
  if (player.readyState() >= 1) {
    setTimeout(checkSavedPosition, 100);
  }
}

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
    this.inputs.month.addEventListener('input', (e) => {
      this.handleInput(e, 'month', 1, 12, this.inputs.day);
    });
    
    this.inputs.day.addEventListener('input', (e) => {
      this.handleInput(e, 'day', 1, 31, this.inputs.year);
    });
    
    this.inputs.year.addEventListener('input', (e) => {
      this.handleInput(e, 'year', 1900, 2100, null);
    });

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
    let value = input.value.replace(/\D/g, '');
    
    if (type === 'year' && value.length > 4) {
      value = value.slice(0, 4);
    } else if (type !== 'year' && value.length > 2) {
      value = value.slice(0, 2);
    }
    
    input.value = value;
    
    if (type === 'month' && value.length >= 1) {
      const monthValue = parseInt(value);
      if ((value.length === 2 && monthValue >= 1 && monthValue <= 12) ||
          (value.length === 1 && monthValue > 1)) {
        nextInput?.focus();
      }
    } else if (type === 'day' && value.length >= 1) {
      const dayValue = parseInt(value);
      if ((value.length === 2 && dayValue >= 1 && dayValue <= 31) ||
          (value.length === 1 && dayValue > 3)) {
        nextInput?.focus();
      }
    } else if (type === 'year' && value.length === 4) {
      const yearValue = parseInt(value);
      if (yearValue >= 1900 && yearValue <= 2100) {
        if (this.nextPicker) {
          this.nextPicker.inputs.month.focus();
        } else {
          input.blur();
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

// Playlist filtering and pagination
function initializePlaylistFeatures() {
  const playlist = document.querySelector('.playlist');
  if (!playlist) return;

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

  const fromLabel = document.createElement('label');
  fromLabel.textContent = 'From:';
  
  const fromDate = document.createElement('div');
  fromDate.className = 'segmented-date';
  fromDate.innerHTML = `
    <input type="text" class="month" placeholder="MM" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="day" placeholder="DD" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="year" placeholder="YYYY" maxlength="4">
  `;

  const toLabel = document.createElement('label');
  toLabel.textContent = 'To:';
  
  const toDate = document.createElement('div');
  toDate.className = 'segmented-date';
  toDate.innerHTML = `
    <input type="text" class="month" placeholder="MM" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="day" placeholder="DD" maxlength="2">
    <span class="separator">/</span>
    <input type="text" class="year" placeholder="YYYY" maxlength="4">
  `;

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.className = 'custom-control-btn';
  clearBtn.type = 'button';
  
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

  // Create pagination controls
  function createPaginationContainer(isBottom = false) {
    const container = document.createElement('div');
    container.className = 'pagination-container';

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

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.className = 'custom-control-btn';
    nextBtn.type = 'button';

    container.appendChild(prevBtn);
    container.appendChild(pageInput);
    container.appendChild(pageInfo);
    container.appendChild(nextBtn);

    if (!isBottom) {
      const itemsPerPageLabel = document.createElement('span');
      itemsPerPageLabel.className = 'page-info';
      itemsPerPageLabel.textContent = 'Items per page:';

      const itemsPerPageInput = document.createElement('select');
      itemsPerPageInput.className = 'items-per-page-input';
      
      [10, 25, 50, 100].forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        if (option === itemsPerPage) optionElement.selected = true;
        itemsPerPageInput.appendChild(optionElement);
      });

      container.appendChild(itemsPerPageLabel);
      container.appendChild(itemsPerPageInput);
      
      return { container, prevBtn, pageInput, pageInfo, nextBtn, itemsPerPageInput };
    }

    return { container, prevBtn, pageInput, pageInfo, nextBtn };
  }

  const topPagination = createPaginationContainer(false);
  const bottomPagination = createPaginationContainer(true);

  // Insert elements
  playlist.parentNode.insertBefore(titleFilter, playlist);
  playlist.parentNode.insertBefore(dateContainer, playlist);
  playlist.parentNode.insertBefore(topPagination.container, playlist);
  playlist.parentNode.insertBefore(bottomPagination.container, playlist.nextSibling);

  // Initialize date pickers
  const fromPicker = new SegmentedDatePicker(fromDate);
  const toPicker = new SegmentedDatePicker(toDate);
  fromPicker.nextPicker = toPicker;

  // Initialize items
  function initializeItems() {
    const items = playlist.querySelectorAll('.other_video_anchor') ||
                 playlist.querySelectorAll('a[href*="watch"]') ||
                 playlist.querySelectorAll('li') ||
                 Array.from(playlist.children);
    
    console.log('Found', items.length, 'playlist items');
    allItems = Array.from(items);
    filteredItems = [...allItems];
  }

  // Update pagination controls
  function updatePaginationControls() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const infoText = `of ${totalPages} (${filteredItems.length} videos)`;
    
    [topPagination, bottomPagination].forEach(({ pageInput, pageInfo, prevBtn, nextBtn }) => {
      pageInfo.textContent = infoText;
      pageInput.max = totalPages;
      pageInput.value = currentPage;
      
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
      
      [prevBtn, nextBtn].forEach(btn => {
        btn.style.opacity = btn.disabled ? '0.5' : '1';
        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
      });
    });
  }

  // Display current page
  function displayCurrentPage() {
    allItems.forEach(item => item.style.display = 'none');
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    filteredItems.slice(startIndex, endIndex).forEach(item => {
      item.style.display = 'block';
    });
    
    updatePaginationControls();
  }

  // Filter function
  function filterPlaylist() {
    const titleTerm = titleFilter.value.toLowerCase();
    const fromDateVal = fromPicker.getDate();
    const toDateVal = toPicker.getDate();

    filteredItems = allItems.filter(item => {
      const titleElement = item.querySelector('.other_video_title') ||
                          item.querySelector('h3, h4, .title, [class*="title"]');
      const dateElement = item.querySelector('.other_video_view_count_date') ||
                         item.querySelector('.date, [class*="date"], [class*="time"]');
      
      if (!titleElement) return true;
      
      const title = titleElement.textContent.toLowerCase();
      const titleMatch = title.includes(titleTerm);
      
      let dateMatch = true;
      if (dateElement && (fromDateVal || toDateVal)) {
        const videoDate = new Date(dateElement.textContent);
        if (fromDateVal && videoDate < fromDateVal) dateMatch = false;
        if (toDateVal && videoDate > toDateVal) dateMatch = false;
      }
      
      return titleMatch && dateMatch;
    });

    currentPage = 1;
    displayCurrentPage();
  }

  // Navigation functions
  function goToPage(pageNum, scrollToTop = false) {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      currentPage = pageNum;
      displayCurrentPage();
      if (scrollToTop) {
        const pos = titleFilter.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: pos - 30, behavior: 'auto' });
      }
    }
  }

  function goToPrevPage(scrollToTop = false) {
    if (currentPage > 1) goToPage(currentPage - 1, scrollToTop);
  }

  function goToNextPage(scrollToTop = false) {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage < totalPages) goToPage(currentPage + 1, scrollToTop);
  }

  // Event listeners
  titleFilter.addEventListener('input', filterPlaylist);
  
  [fromDate, toDate].forEach(dateEl => {
    dateEl.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', filterPlaylist);
    });
  });
  
  clearBtn.addEventListener('click', () => {
    fromPicker.clear();
    toPicker.clear();
    filterPlaylist();
  });
  
  chatToggleBtn.addEventListener('click', () => {
    const chatElement = document.querySelector('.chat');
    if (chatElement) {
      const isHidden = chatElement.style.display === 'none' || 
                      getComputedStyle(chatElement).display === 'none';
      chatElement.style.display = isHidden ? 'flex' : 'none';
      chatToggleBtn.textContent = isHidden ? 'Hide Chat' : 'Show Chat';
    }
  });

  // Pagination event listeners
  [topPagination, bottomPagination].forEach(({ prevBtn, nextBtn, pageInput }, index) => {
    const isBottom = index === 1;
    
    prevBtn.addEventListener('click', () => goToPrevPage(isBottom));
    nextBtn.addEventListener('click', () => goToNextPage(isBottom));
    
    pageInput.addEventListener('change', (e) => {
      goToPage(parseInt(e.target.value), isBottom);
    });
    
    pageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        goToPage(parseInt(e.target.value), isBottom);
      }
    });
  });

  if (topPagination.itemsPerPageInput) {
    topPagination.itemsPerPageInput.addEventListener('change', (e) => {
      itemsPerPage = parseInt(e.target.value);
      currentPage = 1;
      displayCurrentPage();
    });
  }

  // Initialize
  function initialize() {
    initializeItems();
    if (allItems.length === 0) {
      setTimeout(() => {
        initializeItems();
        if (allItems.length > 0) displayCurrentPage();
      }, 1000);
    } else {
      displayCurrentPage();
    }
  }

  initialize();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  }
}

// Initialize everything
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeVideoPositionSaving();
    initializePlaylistFeatures();
  });
} else {
  initializeVideoPositionSaving();
  initializePlaylistFeatures();
}