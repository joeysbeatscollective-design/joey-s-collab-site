// WaveSurfer.js Integration for Professional Waveform Player

class WaveformPlayer {
  constructor() {
    this.wavesurfer = null;
    this.currentBeat = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.init();
  }

  init() {
    // Initialize WaveSurfer
    this.wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: 'rgba(255, 255, 255, 0.3)',
      progressColor: '#00b894',
      cursorColor: '#ffffff',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 1,
      height: 60,
      barGap: 2,
      responsive: true,
      normalize: true,
      backend: 'WebAudio'
    });

    this.attachEventListeners();
  }

  attachEventListeners() {
    const audio = document.getElementById('audio-player');
    const playPauseBtn = document.querySelector('.play-pause');
    const prevBtn = document.querySelector('.prev-track');
    const nextBtn = document.querySelector('.next-track');
    const currentTimeEl = document.querySelector('.current-time');
    const durationEl = document.querySelector('.duration');

    // WaveSurfer events
    this.wavesurfer.on('ready', () => {
      durationEl.textContent = this.formatTime(this.wavesurfer.getDuration());
    });

    this.wavesurfer.on('audioprocess', () => {
      currentTimeEl.textContent = this.formatTime(this.wavesurfer.getCurrentTime());
    });

    this.wavesurfer.on('finish', () => {
      this.playNext();
    });

    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
      this.togglePlayPause();
    });

    // Previous track
    prevBtn.addEventListener('click', () => {
      this.playPrevious();
    });

    // Next track
    nextBtn.addEventListener('click', () => {
      this.playNext();
    });

    // Click on waveform to seek
    this.wavesurfer.on('interaction', () => {
      this.wavesurfer.play();
      playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });
  }

  loadBeat(beat) {
    this.currentBeat = beat;
    
    // Update UI
    const playerCover = document.querySelector('.player-cover img');
    const trackTitle = document.querySelector('.track-title');
    const trackArtist = document.querySelector('.track-artist');
    
    playerCover.src = beat.cover;
    trackTitle.textContent = beat.title;
    trackArtist.textContent = `${beat.bpm} BPM • ${beat.key}`;

    // Load audio into WaveSurfer
    this.wavesurfer.load(beat.audioPreview);
    
    // Show player
    document.getElementById('global-player').classList.add('active');

    // Log play event
    analytics.logEvent('beat_played', {
      beat_id: beat.id,
      beat_title: beat.title
    });
  }

  setPlaylist(beats) {
    this.playlist = beats;
  }

  play() {
    this.wavesurfer.play();
    document.querySelector('.play-pause').innerHTML = '<i class="fas fa-pause"></i>';
    
    // Update all beat cards
    this.updateBeatCardButtons();
  }

  pause() {
    this.wavesurfer.pause();
    document.querySelector('.play-pause').innerHTML = '<i class="fas fa-play"></i>';
    this.updateBeatCardButtons();
  }

  togglePlayPause() {
    if (this.wavesurfer.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  playNext() {
    if (this.playlist.length === 0) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    const nextBeat = this.playlist[this.currentIndex];
    this.loadBeat(nextBeat);
    this.play();
  }

  playPrevious() {
    if (this.playlist.length === 0) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    const prevBeat = this.playlist[this.currentIndex];
    this.loadBeat(prevBeat);
    this.play();
  }

  updateBeatCardButtons() {
    // Reset all play buttons
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.innerHTML = '<i class="fas fa-play"></i>';
    });

    // Update current beat's button
    if (this.currentBeat && this.wavesurfer.isPlaying()) {
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
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Initialize global player
let waveformPlayer;
document.addEventListener('DOMContentLoaded', () => {
  waveformPlayer = new WaveformPlayer();
});
