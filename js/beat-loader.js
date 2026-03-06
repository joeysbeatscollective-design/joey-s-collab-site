// =============================================
// BEAT LOADER - JOEY FLAVOUR BEATS
// =============================================

class BeatLoader {
  constructor(containerSelector, filterType = 'all') {
    this.container = document.querySelector(containerSelector);
    this.filterType = filterType;
    this.currentBeats = [];
    
    if (this.container) {
      this.init();
    }
  }

  init() {
    this.loadBeats();
    this.initFilters();
    this.initSearch();
  }

  loadBeats(tagFilter = 'all') {
    let beats = beatsDatabase;

    // Filter by page type
    if (this.filterType === 'free') {
      beats = beats.filter(b => b.type === 'free');
    } else if (this.filterType === 'paid') {
      beats = beats.filter(b => b.type === 'paid');
    }

    // Filter by tag
    if (tagFilter !== 'all') {
      beats = beats.filter(b => b.tags.includes(tagFilter));
    }

    this.currentBeats = beats;

    // Update player playlist
    if (typeof waveformPlayer !== 'undefined') {
      waveformPlayer.setPlaylist(beats);
    }

    this.renderBeats(beats);
  }

  renderBeats(beats) {
    if (!this.container) return;

    this.container.innerHTML = '';

    if (beats.length === 0) {
      this.container.innerHTML = '<p class="no-results">No beats found</p>';
      return;
    }

    beats.forEach((beat, index) => {
      const card = this.createBeatCard(beat, index);
      this.container.appendChild(card);
    });
  }

  createBeatCard(beat, index) {
    const card = document.createElement('div');
    card.classList.add('beat-card');
    card.dataset.beatId = beat.id;

    card.innerHTML = `
      <div class="beat-cover">
        <img src="${beat.cover}" alt="${beat.title}" loading="lazy">
        <div class="play-overlay">
          <button class="play-btn" data-index="${index}" aria-label="Play ${beat.title}">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
      
      <div class="beat-info">
        <h3 class="beat-title">${beat.title}</h3>
        <div class="beat-meta">
          <span><i class="fas fa-drum"></i> ${beat.bpm} BPM</span>
          <span><i class="fas fa-music"></i> ${beat.key}</span>
        </div>
        <div class="beat-tags">
          ${beat.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>

      <div class="beat-actions">
        ${this.createActionButtons(beat)}
      </div>
    `;

    this.attachCardEvents(card, beat, index);
    return card;
  }

  createActionButtons(beat) {
    if (beat.type === 'free') {
      return `
        <button class="btn-primary free-download">
          <i class="fas fa-download"></i>
          <span>FREE DOWNLOAD</span>
        </button>
      `;
    } else {
      const basicPrice = beat.licenses.basic.price;
      return `
        <div class="license-selector">
          <select class="license-select">
            <option value="basic">Basic - $${beat.licenses.basic.price}</option>
            <option value="premium">Premium - $${beat.licenses.premium.price}</option>
            <option value="exclusive">Exclusive - $${beat.licenses.exclusive.price}</option>
          </select>
        </div>
        <button class="btn-primary buy-now">
          <i class="fas fa-shopping-cart"></i>
          <span>BUY NOW</span>
        </button>
      `;
    }
  }

  attachCardEvents(card, beat, index) {
    // Play button
    const playBtn = card.querySelector('.play-btn');
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof waveformPlayer !== 'undefined') {
        waveformPlayer.currentIndex = index;
        waveformPlayer.loadBeat(beat);
        waveformPlayer.play();
      }
    });

    // Free download
    const downloadBtn = card.querySelector('.free-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.handleFreeDownload(beat));
    }

    // Buy button
    const buyBtn = card.querySelector('.buy-now');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const licenseSelect = card.querySelector('.license-select');
        this.handlePurchase(beat, licenseSelect.value);
      });
    }
  }

  handleFreeDownload(beat) {
    const modal = this.createEmailModal(beat);
    document.body.appendChild(modal);
  }

  createEmailModal(beat) {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <div class="modal-header">
          <img src="${beat.cover}" alt="${beat.title}" class="modal-cover">
          <div>
            <h2>Download "${beat.title}"</h2>
            <p>${beat.bpm} BPM • ${beat.key}</p>
          </div>
        </div>
        <p class="modal-description">
          Enter your email to get instant untagged download + updates on new beats
        </p>
        <form class="email-form">
          <input type="email" name="email" placeholder="your@email.com" required>
          <button type="submit" class="btn-primary">
            <i class="fas fa-download"></i>
            <span>DOWNLOAD NOW</span>
          </button>
        </form>
        <p class="modal-terms">
          By downloading, you agree to credit "Prod. Joey Flavour" and tag @joeyflavour
        </p>
      </div>
    `;

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());

    // Form submit
    modal.querySelector('.email-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = e.target.email.value;

      // Save to Firebase
      if (typeof saveEmailToFirebase !== 'undefined') {
        await saveEmailToFirebase(email, beat.id, 'free_download');
      }
      if (typeof trackDownload !== 'undefined') {
        await trackDownload(beat.id, email);
      }

      // Trigger download
      this.downloadFile(beat.audioFull, `${beat.title} (Prod. Joey Flavour).wav`);

      modal.remove();
      showNotification(`✅ ${beat.title} downloading!`);
    });

    return modal;
  }

  handlePurchase(beat, license) {
    const licenseData = beat.licenses[license];
    const modal = this.createPaymentModal(beat, license, licenseData);
    document.body.appendChild(modal);
  }

  createPaymentModal(beat, license, licenseData) {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content payment-modal">
        <button class="modal-close">&times;</button>
        
        <h2>Purchase "${beat.title}"</h2>
        
        <div class="purchase-summary">
          <div class="summary-item">
            <span>License</span>
            <strong>${license.toUpperCase()}</strong>
          </div>
          <div class="summary-item">
            <span>Files</span>
            <strong>${licenseData.files.join(', ')}</strong>
          </div>
          <div class="summary-item total">
            <span>Total</span>
            <strong>$${licenseData.price}</strong>
          </div>
        </div>

        <form class="payment-email-form">
          <input type="email" name="email" placeholder="your@email.com" required>
        </form>

        <div class="payment-buttons">
          <button class="btn-stripe">
            <i class="fab fa-stripe"></i>
            <span>Pay with Card</span>
          </button>
          <button class="btn-paypal">
            <i class="fab fa-paypal"></i>
            <span>PayPal</span>
          </button>
        </div>

        <p class="payment-note">
          <i class="fas fa-lock"></i> Secure checkout • Instant delivery
        </p>
      </div>
    `;

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());

    // Stripe
    modal.querySelector('.btn-stripe').addEventListener('click', async () => {
      const email = modal.querySelector('input[name="email"]').value;
      if (!email) {
        showNotification('❌ Please enter your email');
        return;
      }
      await this.processStripePayment(beat, license, licenseData, email);
      modal.remove();
    });

    // PayPal
    modal.querySelector('.btn-paypal').addEventListener('click', async () => {
      const email = modal.querySelector('input[name="email"]').value;
      if (!email) {
        showNotification('❌ Please enter your email');
        return;
      }
      await this.processPayPalPayment(beat, license, licenseData, email);
      modal.remove();
    });

    return modal;
  }

  async processStripePayment(beat, license, licenseData, email) {
    try {
      showNotification('🔄 Redirecting to checkout...');

      const response = await fetch('http://localhost:3000/create-stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatId: beat.id,
          beatTitle: beat.title,
          license: license,
          price: licenseData.price,
          email: email
        })
      });

      const { url } = await response.json();

      if (typeof trackPurchase !== 'undefined') {
        await trackPurchase(beat.id, license, licenseData.price, email, 'stripe');
      }

      window.location.href = url;
    } catch (error) {
      console.error('Stripe error:', error);
      showNotification('❌ Payment failed. Please try again.');
    }
  }

  async processPayPalPayment(beat, license, licenseData, email) {
    try {
      showNotification('🔄 Opening PayPal...');

      const response = await fetch('http://localhost:3000/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatId: beat.id,
          beatTitle: beat.title,
          license: license,
          price: licenseData.price,
          email: email
        })
      });

      const { approvalUrl } = await response.json();

      if (typeof trackPurchase !== 'undefined') {
        await trackPurchase(beat.id, license, licenseData.price, email, 'paypal');
      }

      window.location.href = approvalUrl;
    } catch (error) {
      console.error('PayPal error:', error);
      showNotification('❌ Payment failed. Please try again.');
    }
  }

  downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  initFilters() {
    const filterBtns = document.querySelectorAll('.tag-filter');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadBeats(btn.dataset.tag);
      });
    });
  }

  initSearch() {
    const searchInput = document.getElementById('search-beats');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value.toLowerCase();
        const filtered = this.currentBeats.filter(b =>
          b.title.toLowerCase().includes(query) ||
          b.tags.some(tag => tag.toLowerCase().includes(query))
        );
        this.renderBeats(query ? filtered : this.currentBeats);
      }, 300);
    });
  }
}

// Notification helper
function showNotification(message, duration = 3000) {
  // Remove existing
  document.querySelectorAll('.notification').forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.classList.add('notification');
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.style.display = mobileMenu.style.display === 'block' ? 'none' : 'block';
    });
  }

  // Initialize beat loader based on page
  const path = window.location.pathname;
  if (path.includes('buy.html')) {
    new BeatLoader('#beat-grid', 'paid');
  } else {
    new BeatLoader('#beat-grid', 'free');
  }

  // Animate stats
  document.querySelectorAll('.stat-number').forEach(stat => {
    const target = parseInt(stat.dataset.target);
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      stat.textContent = current >= 1000000
        ? (current / 1000000).toFixed(1) + 'M'
        : current >= 1000
        ? Math.floor(current / 1000) + 'K+'
        : Math.floor(current) + '+';
    }, 40);
  });
});
