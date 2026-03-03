let currentAudio;

function playPreview(file) {
  if (currentAudio) {
    currentAudio.pause();
  }
  currentAudio = new Audio(file);
  currentAudio.play();
}
