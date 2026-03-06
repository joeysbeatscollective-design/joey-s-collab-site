// WaveSurfer players
let waves = {};
function initWave(id, url){
  waves[id] = WaveSurfer.create({
    container: `#${id}`,
    waveColor: '#3154ff',
    progressColor: '#fff',
    height: 60
  });
  waves[id].load(url);
}

// Example free download
function downloadBeat(url){
  const link = document.createElement('a');
  link.href = url;
  link.download = url.split('/').pop();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Stripe / PayPal placeholder
function checkoutBeat(beatName, licenseSelectId){
  const license = document.getElementById(licenseSelectId).value;
  alert(`Checkout ${beatName} (${license}) via Stripe / PayPal`);
  // Here you call your backend to create payment session
}

// Sticky player functions (basic)
let currentTrack = 0;
let trackList = [
  {title:'Abyss', cover:'./covers/ABYSS.png', url:'./beats/Abyss.mp3'},
  {title:'Eclipse', cover:'./covers/ECLIPSE.png', url:'./beats/ECLIPSE.mp3'}
];
const playerTitle = document.getElementById('pTitle');
const playerThumb = document.getElementById('pThumb');
let audio = new Audio();
function playTrack(index){
  currentTrack = index;
  audio.src = trackList[index].url;
  playerTitle.textContent = trackList[index].title;
  playerThumb.src = trackList[index].cover;
  audio.play();
}
function togglePlayer(){
  if(audio.paused) audio.play();
  else audio.pause();
}
function nextTrack(){
  currentTrack = (currentTrack+1) % trackList.length;
  playTrack(currentTrack);
}
function prevTrack(){
  currentTrack = (currentTrack-1 + trackList.length) % trackList.length;
  playTrack(currentTrack);
}

// Initialize Waves
window.addEventListener('load',()=>{
  trackList.forEach((t,i)=>initWave(`wave-beat${i+1}`, t.url));
  playTrack(0);
});
