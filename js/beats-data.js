// CENTRAL BEATS DATABASE
const beatsDatabase = [
  // FREE BEATS
  {
    id: 1,
    title: "Midnight Vibes",
    bpm: 140,
    key: "Am",
    cover: "covers/cover1.jpg",
    audioPreview: "audio/previews/midnight-vibes-preview.mp3",
    audioFull: "audio/full/midnight-vibes-full.wav",
    type: "free",
    tags: ["trap", "dark", "moody"],
    dateAdded: "2024-01-15"
  },
  {
    id: 2,
    title: "Summer Heat",
    bpm: 128,
    key: "C",
    cover: "covers/cover2.jpg",
    audioPreview: "audio/previews/summer-heat-preview.mp3",
    audioFull: "audio/full/summer-heat-full.wav",
    type: "free",
    tags: ["afrobeat", "dancehall", "summer"],
    dateAdded: "2024-01-20"
  },
  {
    id: 3,
    title: "Cold Streets",
    bpm: 145,
    key: "Dm",
    cover: "covers/cover3.jpg",
    audioPreview: "audio/previews/cold-streets-preview.mp3",
    audioFull: "audio/full/cold-streets-full.wav",
    type: "free",
    tags: ["drill", "uk-drill", "hard"],
    dateAdded: "2024-01-25"
  },
  
  // PAID BEATS
  {
    id: 4,
    title: "Dark Drill Deluxe",
    bpm: 145,
    key: "Gm",
    cover: "covers/cover4.jpg",
    audioPreview: "audio/previews/dark-drill-preview.mp3",
    audioFull: "audio/full/dark-drill-full.wav",
    audioStems: "audio/stems/dark-drill-stems.zip",
    type: "paid",
    price: 29.99,
    licenses: {
      basic: {
        price: 29.99,
        files: ["MP3", "WAV"],
        streams: 10000,
        distribution: false,
        creditRequired: true
      },
      premium: {
        price: 79.99,
        files: ["MP3", "WAV", "Stems"],
        streams: -1, // unlimited
        distribution: true,
        creditRequired: true
      },
      exclusive: {
        price: 299.99,
        files: ["Full Trackout"],
        streams: -1,
        distribution: true,
        creditRequired: false,
        exclusive: true
      }
    },
    tags: ["drill", "uk-drill", "hard", "premium"],
    dateAdded: "2024-01-10"
  },
  {
    id: 5,
    title: "Chill Lofi Dreams",
    bpm: 85,
    key: "Dm",
    cover: "covers/cover5.jpg",
    audioPreview: "audio/previews/lofi-dreams-preview.mp3",
    audioFull: "audio/full/lofi-dreams-full.wav",
    audioStems: "audio/stems/lofi-dreams-stems.zip",
    type: "paid",
    price: 24.99,
    licenses: {
      basic: {
        price: 24.99,
        files: ["MP3", "WAV"],
        streams: 10000,
        distribution: false,
        creditRequired: true
      },
      premium: {
        price: 69.99,
        files: ["MP3", "WAV", "Stems"],
        streams: -1,
        distribution: true,
        creditRequired: true
      },
      exclusive: {
        price: 249.99,
        files: ["Full Trackout"],
        streams: -1,
        distribution: true,
        creditRequired: false,
        exclusive: true
      }
    },
    tags: ["lofi", "chill", "study", "premium"],
    dateAdded: "2024-01-12"
  },
  {
    id: 6,
    title: "Trap Symphony",
    bpm: 150,
    key: "F#m",
    cover: "covers/cover6.jpg",
    audioPreview: "audio/previews/trap-symphony-preview.mp3",
    audioFull: "audio/full/trap-symphony-full.wav",
    audioStems: "audio/stems/trap-symphony-stems.zip",
    type: "paid",
    price: 34.99,
    licenses: {
      basic: {
        price: 34.99,
        files: ["MP3", "WAV"],
        streams: 10000,
        distribution: false,
        creditRequired: true
      },
      premium: {
        price: 89.99,
        files: ["MP3", "WAV", "Stems"],
        streams: -1,
        distribution: true,
        creditRequired: true
      },
      exclusive: {
        price: 349.99,
        files: ["Full Trackout"],
        streams: -1,
        distribution: true,
        creditRequired: false,
        exclusive: true
      }
    },
    tags: ["trap", "orchestral", "epic", "premium"],
    dateAdded: "2024-01-18"
  }
];

// Helper functions
const getFreeBests = () => beatsDatabase.filter(b => b.type === "free");
const getPaidBeats = () => beatsDatabase.filter(b => b.type === "paid");
const getBeatById = (id) => beatsDatabase.find(b => b.id === id);
const searchBeats = (query) => beatsDatabase.filter(b => 
  b.title.toLowerCase().includes(query.toLowerCase()) ||
  b.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
);
