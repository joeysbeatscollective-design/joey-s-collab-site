class BeatLoader {
  constructor(containerSelector, filterType = 'all') {
    this.container = document.querySelector(containerSelector);
    this.filterType = filterType;
    this.currentBeats = [];
    this.init();
  }

  init() {
    this.loadBeats();
    this.initFilters();
    this.initSearch();
  }

  loadBeats(filter = 'all') {
    if (!this.container) return;

    // Filter beats
    let beats = beatsDatabase;
    
    if (this.filterType === 'free') {
      beats = beats.filter(b => b.type === 'free');
    } else if (this.filterType === 'paid') {
      beats = beats.filter(b => b.type === 'paid');
    }

    // Apply tag filter
    if (filter !== 'all') {
      beats = beats.filter(b => b.tags.includes(filter));
    }

    this.currentBeats = beats;
    
    // Set playlist for player
    if (waveformPlayer) {
      waveformPlayer.setPlaylist(beats);
    }

    // Clear and render
    this.container.innerHTML = '';
    
    if (beats.length === 0) {
      this.container.innerHTML = '<p class="no-results">No beats found 😔</p>';
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
          <button class="play-btn" data-index="${index}">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
      
      <div class="beat-info">
        <h3 class="beat-title">${beat.title}</h3>
        <div class="beat-meta">
          <span class="bpm"><i class="fas fa-drum"></i> ${beat.bpm} BPM</span>
          <span class="key"><i class="fas fa-music"></i> ${beat.key}</span>
        </div>
        <div class="beat-tags">
          ${beat.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
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
          <i class="fas fa-download"></i> FREE DOWNLOAD
        </button>
      `;
    } else {
      return `
        <div class="license-selector">
          <select class="license-select">
            <option value="basic">Basic - $${beat.licenses.basic.price}</option>
            <option value="premium">Premium - $${beat.licenses.premium.price}</option>
            <option value="exclusive">Exclusive - $${beat.licenses.exclusive.price}</option>
          </select>
        </div>
        <button class="btn-primary buy-now">
          <i class="fas fa-shopping-cart"></i> BUY NOW
        </button>
      `;
    }
  }

  attachCardEvents(card, beat, index) {
    // Play button
    const playBtn = card.querySelector('.play-btn');
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      waveformPlayer.currentIndex = index;
      waveformPlayer.loadBeat(beat);
      waveformPlayer.play();
    });

    // Free download
    const downloadBtn = card.querySelector('.free-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.handleFreeDownload(beat);
      });
    }

    // Buy button
    const buyBtn = card.querySelector('.buy-now');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const licenseSelect = card.querySelector('.license-select');
        const selectedLicense = licenseSelect.value;
        this.handlePurchase(beat, selectedLicense);
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
            <h2>🎵 Download "${beat.title}"</h2>
            <p>${beat.bpm} BPM • ${beat.key}</p>
          </div>
        </div>
        <p class="modal-description">
          Enter your email to get instant untagged download + updates on new beats 🔥
        </p>
        <form class="email-form">
          <input type="email" name="email" placeholder="your@email.com" required>
          <button type="submit" class="btn-primary">
            <i class="fas fa-download"></i> DOWNLOAD NOW
          </button>
        </form>
        <p class="modal-terms">
          By downloading, you agree to credit "Prod. Joey Flav" and tag @joeyflav
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
      await saveEmailToFirebase(email, beat.id, 'free_download');
      await trackDownload(beat.id, email);
      
      // Trigger download
      this.downloadFile(beat.audioFull, `${beat.title}.wav`);
      
      modal.remove();
      showNotification(`✅ ${beat.title} downloaded! Check your downloads folder.`);
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
        
        <h2>💳 Purchase "${beat.title}"</h2>
        
        <div class="purchase-summary">
          <div class="summary-item">
            <span>License Type:</span>
            <strong>${license.toUpperCase()}</strong>
          </div>
          <div class="summary-item">
            <span>Files Included:</span>
            <strong>${licenseData.files.join(', ')}</strong>
          </div>
          <div class="summary-item">
            <span>Distribution Rights:</span>
            <strong>${licenseData.distribution ? 'Yes' : 'No'}</strong>
          </div>
          <div class="summary-item total">
            <span>Total:</span>
            <strong>$${licenseData.price}</strong>
          </div>
        </div>

        <form class="payment-email-form">
          <input type="email" name="email" placeholder="your@email.com" required>
        </form>

        <div class="payment-buttons">
          <button class="btn-stripe">
            <i class="fab fa-stripe"></i>
            Pay with Card
          </button>
          <button class="btn-paypal">
            <i class="fab fa-paypal"></i>
            PayPal
          </button>
        </div>

        <p class="payment-note">
          🔒 Secure checkout • Instant delivery via email
        </p>
      </div>
    `;

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());

    // Stripe button
    modal.querySelector('.btn-stripe').addEventListener('click', async () => {
      const email = modal.querySelector('input[name="email"]').value;
      if (!email) {
        showNotification('❌ Please enter your email');
        return;
      }
      
      await this.processStripePayment(beat, license, licenseData, email);
      modal.remove();
    });

    // PayPal button
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
      showNotification('🔄 Redirecting to secure checkout...');
      
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
      
      // Track purchase attempt
      await trackPurchase(beat.id, license, licenseData.price, email, 'stripe');
      
      // Redirect to Stripe Checkout
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
      
      // Track purchase attempt
      await trackPurchase(beat.id, license, licenseData.price, email, 'paypal');
      
      // Redirect to PayPal
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
    link.click();
  }

  initFilters() {
    const filterBtns = document.querySelectorAll('.tag-filter');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter beats
        const tag = btn.dataset.tag;
        this.loadBeats(tag);
      });
    });
  }

  initSearch() {
    const searchInput = document.getElementById('search-beats');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      
      let beats = this.currentBeats;
      
      if (query) {
        beats = beats.filter(b => 
          b.title.toLowerCase().includes(query) ||
          b.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      // Re-render
      this.container.innerHTML = '';
      beats.forEach((beat, index) => {
        const card = this.createBeatCard(beat, index);
        this.container.appendChild(card);
      });
    });
  }
}

// Notification helper
function showNotification(message, duration = 3000) {
  const notification = document.createElement('div');
  notification.classList.add('notification');
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  
  if (path.includes('buy.html')) {
    new BeatLoader('.beat-grid', 'paid');
  } else {
    new BeatLoader('.beat-grid', 'free');
  }
});
