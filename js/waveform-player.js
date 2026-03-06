// =============================================
// WAVEFORM PLAYER - JOEY FLAVOUR BEATS
// =============================================

class WaveformPlayer {
  constructor() {
    this.wavesurfer = null;
    this.currentBeat = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.isReady = false;
    this.init();
  }

  init() {
    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer) return;

    this.wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: 'rgba(255, 255, 255, 0.2)',
      progressColor: '#00b894',
      cursorColor: 'transparent',
      barWidth: 2,
      barRadius: 2,
      barGap: 2,
      height: 40,
      responsive: true,
      normalize: true
    });

    this.attachEventListeners();
  }

  attachEventListeners() {
    if (!this.wavesurfer) return;

    const playPauseBtn = document.querySelector('.play-pause');
    const prevBtn = document.querySelector('.prev-track');
    const nextBtn = document.querySelector('.next-track');
    const currentTimeEl = document.querySelector('.current-time');
    const durationEl = document.querySelector('.duration');
    const volumeSlider = document.querySelector('.volume-slider');

    this.wavesurfer.on('ready', () => {
      this.isReady = true;
      if (durationEl) {
        durationEl.textContent = this.formatTime(this.wavesurfer.getDuration());
      }
    });

    this.wavesurfer.on('audioprocess', () => {
      if (currentTimeEl) {
        currentTimeEl.textContent = this.formatTime(this.wavesurfer.getCurrentTime());
      }
    });

    this.wavesurfer.on('finish', () => this.playNext());

    this.wavesurfer.on('play', () => {
      if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      }
    });

    this.wavesurfer.on('pause', () => {
      if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    });

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.playPrevious());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.playNext());
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.wavesurfer.setVolume(e.target.value / 100);
      });
    }
  }

  loadBeat(beat) {
    if (!this.wavesurfer) return;

    this.currentBeat = beat;

    // Update UI
    const playerCover = document.querySelector('.player-cover img');
    const trackTitle = document.querySelector('.track-title');
    const trackMeta = document.querySelector('.track-meta');

    if (playerCover) playerCover.src = beat.cover;
    if (trackTitle) trackTitle.textContent = beat.title;
    if (trackMeta) trackMeta.textContent = `${beat.bpm} BPM • ${beat.key}`;

    // Load audio
    this.wavesurfer.load(beat.audioPreview);

    // Show player
    const player = document.getElementById('global-player');
    if (player) player.classList.add('active');

    // Log analytics
    if (typeof analytics !== 'undefined') {
      analytics.logEvent('beat_played', {
        beat_id: beat.id,
        beat_title: beat.title
      });
    }
  }

  setPlaylist(beats) {
    this.playlist = beats;
  }

  play() {
    if (this.wavesurfer && this.isReady) {
      this.wavesurfer.play();
      this.updateBeatCardButtons();
    }
  }

  pause() {
    if (this.wavesurfer) {
      this.wavesurfer.pause();
      this.updateBeatCardButtons();
    }
  }

  togglePlayPause() {
    if (this.wavesurfer) {
      this.wavesurfer.playPause();
    }
  }

  playNext() {
    if (this.playlist.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.loadBeat(this.playlist[this.currentIndex]);
    setTimeout(() => this.play(), 100);
  }

  playPrevious() {
    if (this.playlist.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.loadBeat(this.playlist[this.currentIndex]);
    setTimeout(() => this.play(), 100);
  }

  updateBeatCardButtons() {
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.innerHTML = '<i class="fas fa-play"></i>';
    });

    if (this.currentBeat && this.wavesurfer && this.wavesurfer.isPlaying()) {
      const currentCard = document.querySelector(`[data-beat-id="${this.currentBeat.id}"]`);
      if (currentCard) {
        const playBtn = currentCard.querySelector('.play-btn');
        if (playBtn) {
          playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
      }
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Initialize
let waveformPlayer;
document.addEventListener('DOMContentLoaded', () => {
  waveformPlayer = new WaveformPlayer();
});
