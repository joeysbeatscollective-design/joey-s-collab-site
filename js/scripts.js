// Dark Mode Toggle
const darkToggle = document.getElementById('dark-mode-toggle');
if(darkToggle){
  darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });
}

// Free download buttons
document.querySelectorAll('.free-download').forEach(btn => {
  btn.addEventListener('click', () => {
    const audio = btn.parentElement.querySelector('audio');
    if(audio){
      const link = document.createElement('a');
      link.href = audio.src;
      link.download = audio.src.split('/').pop();
      link.click();
    }
  });
});

// BeatStars-style waveform (simple placeholder)
document.querySelectorAll('.waveform-player').forEach(player => {
  // Optional: integrate WaveSurfer.js for real waveform
  player.controls = true;
});

// AI Beat Recommendation (dummy example)
function recommendBeats(currentBeatId){
  // Replace with AI logic or backend call
  console.log("Recommend beats for:", currentBeatId);
}

// Stripe & PayPal buttons placeholder
document.querySelectorAll('.buy-stripe').forEach(btn=>{
  btn.addEventListener('click',()=>{ alert("Stripe checkout coming soon!"); });
});
document.querySelectorAll('.buy-paypal').forEach(btn=>{
  btn.addEventListener('click',()=>{ alert("PayPal checkout coming soon!"); });
});

// Dashboard Upload (for producer)
const uploadInput = document.getElementById('beat-upload');
const uploadBtn = document.getElementById('upload-button');
if(uploadBtn && uploadInput){
  uploadBtn.addEventListener('click', () => {
    const files = uploadInput.files;
    if(files.length > 0){
      alert(`${files.length} beat(s) ready to upload!`);
      // Implement server upload here
    } else alert("Select files first.");
  });
}
