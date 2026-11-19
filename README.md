# 💃 Dancing Cousins – Bollywood Wedding Sangeet Studio

> **Official Bollywood Dance Mashup Generator, Dynamic Audio Sequencer & Wedding Performance Planner for Prince Bhaiya's Sangeet Celebration.**

---

## 🌟 Overview

**Dancing Cousins** is a full-featured Bollywood audio production suite and interactive web application designed to plan, choreograph, sequence, and broadcast-master the music for a grand Indian wedding Sangeet.

The application features:
1. **Dynamic Real-Time Sequencer Engine:** Play, trim, and reorder songs on the fly with instantaneous live audio playback sync.
2. **Fast Broadcast-Mastered Audio Pipeline:** FFmpeg beat-matched crossfades, Punjabi Dhol rolls, EDM risers, sub-bass drops, and EBU R128 (-14 LUFS) mastering producing pristine 320 kbps MP3 & Lossless WAV exports in ~8–10 seconds.
3. **100% Mobile & Tablet Responsive:** Optimized for iPhone (iOS Safari), Android (Chrome), iPads, and desktop displays with touch-first controls.
4. **Complete Wedding Performance Booklet:** Single-heading PDF titled **"Dancing Cousins"** detailing exact dancer lineups, timing breakdown, stage formations, and choreography cues for the whole family.

---

## 🎭 The Three Headline Performances

### 🕺 Dance 1 — Boyz Only (Groomsmen & Brothers)
- **Target Duration:** 5m 30s (Max 6m 00s)
- **Style:** High-energy, playful, mischievous, brotherhood swag
- **Selected Songs (6 Tracks):**
  1. *Oo Jane Jaana* – Pyaar Kiya To Darna Kya (Salman Khan shirtless swag entry)
  2. *Make Some Noise For The Desi Boyz* – Desi Boyz (KK & Bob)
  3. *Tu Dil Maangda Hai Dildaar Sohniye* – Mujhse Shaadi Karogi (Sonu Nigam)
  4. *Kali Bhali* – Padmaavat (Ranveer Singh Khalibali energy)
  5. *Chunari Chunari* – Biwi No. 1 (Abhijeet & Anuradha Sriram)
  6. *Bhootni Ke* – Singh Is Kinng (Daler Mehndi)
- **Confirmed Dancers:** Nishu, Yashu, Monti Bhaiya, Goldi Bhaiya, Priyanshu, Open Spots.

---

### 💃 Dance 2 — Cousins Combined (Family & Couples Celebration)
- **Target Duration:** 5m 20s
- **Style:** Joyful, inclusive, celebratory partner twirls and group formations
- **Selected Songs (7 Tracks):**
  1. *Veerey Di Wedding* – Entertainment (Mika Singh & Akshay Kumar)
  2. *Gallan Goodiyaan* – Dil Dhadakne Do (Farhan Akhtar, Shankar Mahadevan)
  3. *Nachde Ne Saare* – Baar Baar Dekho (Jasleen Royal)
  4. *London Thumakda* – Queen (Labh Janjua)
  5. *Ding Dong Dole* – Kucch To Hai (KK & Sunidhi Chauhan)
  6. *Sauda Khara Khara* – Good Newwz (Diljit Dosanjh, Sukhbir)
  7. *Oh Ho Ho Ho (Ishq Tera Tadpave)* – Sukhbir (The Desi Finale Anthem)
- **Dancers:** Prince Bhaiya & Bhabhi, Priya Didi, Ankush Jeejaji, Monti Bhaiya & Bhabhi, Goldy Bhaiya & Bhabhi, Yashu, Nishu, All Cousins.

---

### 🎆 Grand Finale — Deewangi Deewangi (Om Shanti Om Full Song)
- **Duration:** 8 minutes 57 seconds (Complete unedited original recording)
- **Concept:** Recreating the legendary 31-superstar Bollywood red-carpet arrival sequence!
- **Participation:** **OPEN TO EVERYONE** (30+ family members, parents, uncles, aunts, relatives, and wedding guests).
- **Phases:** 7 entry waves culminating in a massive confetti shower and standing ovation around Prince Bhaiya & Bhabhi.

---

## 🚀 Quick Start (Run Locally)

### Prerequisites
- Python 3.9+
- FFmpeg (automatically handled via `imageio-ffmpeg` or system FFmpeg)

```bash
# Clone the repository
git clone https://github.com/sanskarpathak2110-source/dancing-cousins-sangeet-studio.git
cd dancing-cousins-sangeet-studio

# Install dependencies
pip install imageio-ffmpeg

# Launch the Bollywood DJ Studio
python server.py 8082
```

Open your browser to:
- **Bollywood DJ Studio:** [http://localhost:8082](http://localhost:8082)
- **Download Booklet PDF:** [http://localhost:8082/public/Dancing_Cousins.pdf](http://localhost:8082/public/Dancing_Cousins.pdf)

---

## 🛠️ Project Structure

```
dancing-cousins-sangeet-studio/
├── audio_engine.py       # High-speed FFmpeg mixing, acrossfades & -14 LUFS mastering
├── server.py             # HTTP streaming server with range request support & solo preview
├── projects/
│   ├── dance_number_1_v1.json   # Dance 1 timeline, BPMs, cues, and trims
│   └── dance_number_2_v1.json   # Dance 2 timeline, BPMs, cues, and trims
├── public/
│   ├── index.html        # Responsive Studio UI (Desktop, Tablet, iOS, Android)
│   ├── app.js            # Live Sequencer Engine, instant cut player, waveform generator
│   ├── style.css         # Dark luxury neon studio theme & mobile media queries
│   └── Dancing_Cousins.pdf  # Official Sangeet Performance Booklet
├── sfx/                  # High-impact DJ transitions (dhol rolls, risers, drops)
└── README.md
```

---

## 👑 Credits & Dedication
Built with love for **Prince Bhaiya & Bhabhi's Royal Wedding Sangeet Celebration**! 🎊
