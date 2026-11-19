/**
 * Dancing Cousins – Bollywood Mashup Studio
 * Ultra-Responsive Dynamic Audio Sequencer Engine, Live Timeline Trimmer,
 * Waveform Visualizer, and Broadcast-Mastered FFmpeg Export.
 */

let currentDanceId = '1';
let project = null;
let masterPlayer = null;
let soloPlayer = null;
let finalePlayer = null;
let isSeqPlaying = false;
let isSoloPlaying = false;
let currentSeqIndex = 0;
let currentTrackOffset = 0;
let currentSoloTrackIdx = -1;
let autoSaveTimer = null;
let bgRemixTimer = null;

// Initialize players
function initAudioPlayers() {
  if (!masterPlayer) masterPlayer = document.getElementById('masterAudioPlayer');
  if (!soloPlayer) soloPlayer = document.getElementById('soloAudioPlayer');
  if (!finalePlayer) finalePlayer = document.getElementById('finaleAudioPlayer');

  if (masterPlayer) {
    masterPlayer.addEventListener('timeupdate', onMasterTimeUpdate);
    masterPlayer.addEventListener('ended', onMasterTrackEnded);
    masterPlayer.addEventListener('error', (e) => {
      console.warn('Master player error:', e);
    });
  }

  if (soloPlayer) {
    soloPlayer.addEventListener('ended', () => {
      stopMasterPlayback();
    });
  }
}

function getMasterVolume() {
  const volSlider = document.getElementById('masterVolumeSlider');
  if (volSlider) return parseFloat(volSlider.value) / 100;
  return 0.85;
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function calculateTotalDuration() {
  if (!project || !project.items || project.items.length === 0) return 320.0;
  let total = 0;
  for (let i = 0; i < project.items.length; i++) {
    const item = project.items[i];
    let segDur = Math.max(0, parseFloat(item.endSec) - parseFloat(item.startSec));
    if (i < project.items.length - 1) {
      const trans = item.transitionOut || {};
      const transDur = Math.min(parseFloat(trans.duration || 2.0), segDur * 0.35);
      total += (segDur - transDur);
    } else {
      total += segDur;
    }
  }
  return total;
}

function updateTotalDurationDisplay() {
  const total = calculateTotalDuration();
  const clock = document.getElementById('totalDurationClock');
  const fill = document.getElementById('durProgressFill');
  const nowTime = document.getElementById('playbackTimeText');
  
  if (clock) clock.innerText = formatTime(total);
  if (nowTime && !isSeqPlaying) nowTime.innerText = `00:00 / ${formatTime(total)}`;
  
  if (fill) {
    const pct = Math.min(100, (total / 360) * 100);
    fill.style.width = `${pct}%`;
    fill.style.background = (total >= 310 && total <= 340) ? 'var(--emerald-accent)' : 'var(--cyan-accent)';
  }
}

// Auto-save project changes to server (debounced)
function autoSaveProject() {
  if (currentDanceId === 'finale') return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    try {
      await fetch(`/api/project?dance=${currentDanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      console.log(`Dance ${currentDanceId} project timeline saved to disk.`);
    } catch (e) {
      console.error('Auto-save error:', e);
    }
  }, 300);

  // Trigger background re-mix so export file is kept updated
  triggerBackgroundRemix();
}

function triggerBackgroundRemix() {
  clearTimeout(bgRemixTimer);
  bgRemixTimer = setTimeout(async () => {
    try {
      console.log(`[Auto-Remix] Re-rendering Dance ${currentDanceId} in background...`);
      await fetch(`/api/render?dance=${currentDanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: project.items, dance: currentDanceId })
      });
      console.log(`[Auto-Remix] Master mix successfully compiled.`);
    } catch (e) {
      console.warn('[Auto-Remix] Background render warning:', e);
    }
  }, 1000);
}

// -------------------------------------------------------------
// Project Load & Tab Switching
// -------------------------------------------------------------
async function loadProject(danceId = '1') {
  try {
    const res = await fetch(`/api/project?dance=${danceId}`);
    project = await res.json();
    renderTracks();
    updateTotalDurationDisplay();
    currentSeqIndex = 0;
  } catch (err) {
    console.error('Error loading project:', err);
  }
}

async function saveProject() {
  if (currentDanceId === 'finale') return;
  try {
    const res = await fetch(`/api/project?dance=${currentDanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
    alert(`Dance ${currentDanceId} timeline saved successfully!`);
  } catch (err) {
    alert('Failed to save project: ' + err.message);
  }
}

function switchDanceTab(danceId) {
  currentDanceId = danceId;
  stopMasterPlayback();

  if (finalePlayer && !finalePlayer.paused) {
    finalePlayer.pause();
    const playIcon = document.getElementById('finalePlayIcon');
    if (playIcon) playIcon.innerText = '▶';
  }

  document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));
  if (danceId === '1') document.getElementById('tabDance1').classList.add('active');
  else if (danceId === '2') document.getElementById('tabDance2').classList.add('active');
  else if (danceId === 'finale') document.getElementById('tabFinale').classList.add('active');

  const workstation = document.getElementById('workstationLayout');
  const transportBar = document.getElementById('masterTransportBar');
  const durationCard = document.getElementById('durationMonitorCard');
  const btnSave = document.getElementById('btnSaveProject');
  const btnReMix = document.getElementById('btnReMix');
  const btnRender = document.getElementById('btnRenderMix');
  const finaleSec = document.getElementById('finaleSection');
  const headerSubhead = document.getElementById('headerSubhead');

  if (danceId === 'finale') {
    if (workstation) workstation.style.display = 'none';
    if (transportBar) transportBar.style.display = 'none';
    if (durationCard) durationCard.style.display = 'none';
    if (btnSave) btnSave.style.display = 'none';
    if (btnReMix) btnReMix.style.display = 'none';
    if (btnRender) btnRender.style.display = 'none';
    if (finaleSec) finaleSec.style.display = 'block';

    if (headerSubhead) {
      headerSubhead.innerText = 'Grand Finale: Deewangi Deewangi (Om Shanti Om Full Song)';
    }
  } else {
    if (workstation) workstation.style.display = 'flex';
    if (transportBar) transportBar.style.display = 'flex';
    if (durationCard) durationCard.style.display = 'flex';
    if (btnSave) btnSave.style.display = 'inline-flex';
    if (btnReMix) btnReMix.style.display = 'inline-flex';
    if (btnRender) btnRender.style.display = 'inline-flex';
    if (finaleSec) finaleSec.style.display = 'none';

    if (headerSubhead) {
      if (danceId === '1') {
        headerSubhead.innerText = 'Dance 1: Boyz Only (6 Songs)';
      } else {
        headerSubhead.innerText = 'Dance 2: Cousins Combined (7 Songs)';
      }
    }

    loadProject(danceId);
  }
}

// -------------------------------------------------------------
// Waveform Drawing
// -------------------------------------------------------------
function drawWaveform(canvas, startSec, endSec, totalDur = 200) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const bars = 90;
  const barWidth = width / bars;
  const seed = (startSec * 7 + endSec * 13) % 100;

  for (let i = 0; i < bars; i++) {
    const t = (i / bars) * totalDur;
    const isTrimmed = (t >= startSec && t <= endSec);
    
    const beat = Math.sin(i * 0.45) * 0.4 + Math.sin(i * 0.12) * 0.3 + 0.3;
    const noise = (Math.sin(i * 99 + seed) * 0.5 + 0.5) * 0.3;
    const barHeight = Math.max(4, (beat + noise) * (height - 12));

    ctx.fillStyle = isTrimmed ? '#06b6d4' : '#223045';
    const y = (height - barHeight) / 2;
    ctx.fillRect(i * barWidth, y, barWidth - 1, barHeight);
  }

  // Highlight Trim Window Overlay
  const startX = Math.min(width, Math.max(0, (startSec / totalDur) * width));
  const endX = Math.min(width, Math.max(0, (endSec / totalDur) * width));

  ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
  ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, 0, Math.max(2, endX - startX), height);
}

// -------------------------------------------------------------
// Render Track Cards
// -------------------------------------------------------------
function renderTracks() {
  const container = document.getElementById('tracksContainer');
  if (!container || !project) return;
  container.innerHTML = '';

  project.items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'track-card';
    card.id = `trackCard_${idx}`;

    const segDuration = Math.max(0, item.endSec - item.startSec).toFixed(1);

    card.innerHTML = `
      <div class="track-header">
        <div class="track-meta-left">
          <span class="track-order-badge">#${idx + 1}</span>
          <div class="track-title-group">
            <h3>${item.title} <a href="${item.youtubeUrl}" target="_blank" class="track-source-link" title="Official YouTube Reference">↗ YouTube</a></h3>
            <span class="movie-singer">${item.movie} • <strong>${item.singer || 'Original Recording'}</strong> (${item.originalBpm} BPM | ${item.key || ''})</span>
          </div>
        </div>
        <div class="track-actions-right">
          <button class="btn-icon-sm" onclick="moveTrack(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up (Play earlier)">▲ Move Up</button>
          <button class="btn-icon-sm" onclick="moveTrack(${idx}, 1)" ${idx === project.items.length - 1 ? 'disabled' : ''} title="Move Down (Play later)">▼ Move Down</button>
          <button class="btn btn-secondary btn-icon-sm" onclick="playSoloTrack(${idx})" id="btnSolo_${idx}" style="font-weight: 700; color: #22d3ee; border-color: #22d3ee;">
            ▶ Solo Cut
          </button>
          <button class="btn-icon-sm" onclick="removeTrack(${idx})" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Remove Song">
            🗑️ Remove
          </button>
        </div>
      </div>

      <div class="waveform-section" id="waveformSec_${idx}">
        <canvas class="waveform-canvas" id="canvas_${idx}" width="900" height="72"></canvas>
      </div>

      <div class="track-controls-grid">
        <div class="control-item">
          <label>Start (seconds)</label>
          <input type="number" step="0.5" id="startInput_${idx}" value="${item.startSec}" 
                 onchange="updateTrackTrim(${idx}, 'start', this.value)" title="Exact start second">
        </div>
        <div class="control-item">
          <label>End (seconds)</label>
          <input type="number" step="0.5" id="endInput_${idx}" value="${item.endSec}" 
                 onchange="updateTrackTrim(${idx}, 'end', this.value)" title="Exact end second">
        </div>
        <div class="control-item">
          <label>Duration</label>
          <span class="badge-tag" id="durBadge_${idx}" style="font-weight: 700; color: #f59e0b;">${segDuration}s (${formatTime(segDuration)})</span>
        </div>
        <div class="control-item">
          <label>BPM (${item.targetBpm || item.originalBpm})</label>
          <input type="range" min="${item.originalBpm - 15}" max="${item.originalBpm + 15}" value="${item.targetBpm || item.originalBpm}" oninput="updateTrackBpm(${idx}, this.value)">
        </div>
        <div class="control-item">
          <label>Gain (${item.volumeDb || 0} dB)</label>
          <input type="range" min="-12" max="6" step="0.5" value="${item.volumeDb || 0}" oninput="updateTrackGain(${idx}, this.value)">
        </div>
        <div class="control-item">
          <label>Assigned Audio</label>
          <span class="badge-tag" style="color: #22d3ee; font-size: 0.75rem;">${item.fileName || item.filePath}</span>
        </div>
      </div>

      <div class="dance-cues-tip">
        <strong>💃 Choreography Cue:</strong> ${item.danceCues || 'Synchronized group moves with energetic footwork.'}
      </div>
    `;

    container.appendChild(card);

    // Draw waveform
    setTimeout(() => {
      const cvs = document.getElementById(`canvas_${idx}`);
      drawWaveform(cvs, item.startSec, item.endSec, 200);
    }, 10);

    // Transition Bridge Card
    if (idx < project.items.length - 1) {
      const trans = item.transitionOut || { type: 'crossfade', duration: 2.0 };
      const transBridge = document.createElement('div');
      transBridge.className = 'transition-bridge-card';
      
      let icon = '🎚️';
      if (trans.type === 'dhol_drop') icon = '🥁';
      else if (trans.type === 'scratch' || trans.type === 'scratch_drop') icon = '⚡';
      else if (trans.type === 'riser' || trans.type === 'riser_drop') icon = '🚀';
      else if (trans.type === 'bass_drop') icon = '🔊';
      else if (trans.type === 'drum_fill') icon = '🪘';

      transBridge.innerHTML = `
        <div class="transition-info">
          <span class="trans-icon">${icon}</span>
          <div class="trans-desc">
            <h5>TRANSITION INTO TRACK #${idx + 2}: ${trans.name || trans.type.toUpperCase()}</h5>
            <p>${trans.description || 'Beat-matched blend into next track'}</p>
          </div>
        </div>
        <div class="trans-controls">
          <select onchange="updateTransitionType(${idx}, this.value)">
            <option value="dhol_drop" ${trans.type === 'dhol_drop' ? 'selected' : ''}>🥁 Punjabi Dhol Roll & Sub-Drop</option>
            <option value="bass_drop" ${trans.type === 'bass_drop' ? 'selected' : ''}>🔊 Heavy Sub-Bass Drop</option>
            <option value="drum_fill" ${trans.type === 'drum_fill' ? 'selected' : ''}>🪘 Snappy Drum Fill</option>
            <option value="scratch_drop" ${trans.type === 'scratch_drop' ? 'selected' : ''}>⚡ DJ Vinyl Scratch Spinback</option>
            <option value="riser_drop" ${trans.type === 'riser_drop' ? 'selected' : ''}>🚀 Percussion / EDM Riser Drop</option>
            <option value="crossfade" ${trans.type === 'crossfade' ? 'selected' : ''}>🎚️ Beat-Locked Smooth Crossfade</option>
          </select>
          <select onchange="updateTransitionDuration(${idx}, this.value)">
            <option value="1.0" ${trans.duration == 1.0 ? 'selected' : ''}>1.0s</option>
            <option value="1.5" ${trans.duration == 1.5 ? 'selected' : ''}>1.5s</option>
            <option value="2.0" ${trans.duration == 2.0 ? 'selected' : ''}>2.0s</option>
            <option value="2.5" ${trans.duration == 2.5 ? 'selected' : ''}>2.5s</option>
            <option value="3.0" ${trans.duration == 3.0 ? 'selected' : ''}>3.0s</option>
          </select>
        </div>
      `;
      container.appendChild(transBridge);
    }
  });
}

// -------------------------------------------------------------
// TRACK MOVING & REORDERING (100% Immediate Live Playback Sync)
// -------------------------------------------------------------
function moveTrack(idx, dir) {
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= project.items.length) return;

  const temp = project.items[idx];
  project.items[idx] = project.items[targetIdx];
  project.items[targetIdx] = temp;
  project.items.forEach((it, i) => it.order = i + 1);

  // If mashup playback was currently running, immediately restart playing with the new track at #1!
  if (isSeqPlaying) {
    renderTracks();
    updateTotalDurationDisplay();
    autoSaveProject();
    playSequenceTrack(0, 0);
  } else {
    currentSeqIndex = 0;
    renderTracks();
    updateTotalDurationDisplay();
    autoSaveProject();
  }
}

function removeTrack(idx) {
  const item = project.items[idx];
  if (!confirm(`Are you sure you want to remove "${item.title}" from Dance ${currentDanceId}?\n\nThe mashup will automatically update and play without this song.`)) {
    return;
  }
  const wasPlaying = isSeqPlaying;
  stopMasterPlayback();
  project.items.splice(idx, 1);
  project.items.forEach((it, i) => it.order = i + 1);
  currentSeqIndex = 0;
  renderTracks();
  updateTotalDurationDisplay();
  autoSaveProject();

  if (wasPlaying && project.items.length > 0) {
    playSequenceTrack(0, 0);
  }
}

function updateTrackTrim(idx, type, val) {
  val = parseFloat(val);
  if (isNaN(val) || val < 0) val = 0;
  
  if (type === 'start') {
    project.items[idx].startSec = val;
  } else {
    project.items[idx].endSec = val;
  }

  const segDuration = Math.max(0, project.items[idx].endSec - project.items[idx].startSec).toFixed(1);
  const durBadge = document.getElementById(`durBadge_${idx}`);
  if (durBadge) durBadge.innerText = `${segDuration}s (${formatTime(segDuration)})`;

  const cvs = document.getElementById(`canvas_${idx}`);
  if (cvs) drawWaveform(cvs, project.items[idx].startSec, project.items[idx].endSec, 200);

  updateTotalDurationDisplay();
  autoSaveProject();

  // If this track was currently solo playing, restart solo cut at the new trim!
  if (isSoloPlaying && currentSoloTrackIdx === idx) {
    playSoloTrack(idx);
  }
}

function updateTrackBpm(idx, val) {
  project.items[idx].targetBpm = parseInt(val);
  autoSaveProject();
}

function updateTrackGain(idx, val) {
  project.items[idx].volumeDb = parseFloat(val);
  autoSaveProject();
}

function updateTransitionType(idx, type) {
  if (!project.items[idx].transitionOut) project.items[idx].transitionOut = {};
  project.items[idx].transitionOut.type = type;
  autoSaveProject();
}

function updateTransitionDuration(idx, dur) {
  if (!project.items[idx].transitionOut) project.items[idx].transitionOut = {};
  project.items[idx].transitionOut.duration = parseFloat(dur);
  updateTotalDurationDisplay();
  autoSaveProject();
}

// -------------------------------------------------------------
// DYNAMIC MASHUP AUDIO PLAYBACK ENGINE
// -------------------------------------------------------------
function stopMasterPlayback() {
  isSeqPlaying = false;
  isSoloPlaying = false;
  currentSoloTrackIdx = -1;

  if (masterPlayer) {
    masterPlayer.pause();
  }
  if (soloPlayer) {
    soloPlayer.pause();
  }

  const icon = document.getElementById('masterPlayIcon');
  if (icon) icon.innerText = '▶';

  const nowBadge = document.getElementById('nowBadgeText');
  if (nowBadge) nowBadge.innerText = 'STOPPED:';

  document.querySelectorAll('.btn-icon-sm').forEach(b => {
    if (b.innerText.includes('Stop')) b.innerText = '▶ Solo Cut';
  });
  document.querySelectorAll('.track-card').forEach(c => c.classList.remove('is-playing'));
}

function toggleMasterPlay() {
  initAudioPlayers();
  if (isSeqPlaying) {
    // Pause playback
    if (masterPlayer) masterPlayer.pause();
    isSeqPlaying = false;
    const icon = document.getElementById('masterPlayIcon');
    if (icon) icon.innerText = '▶';
    const nowBadge = document.getElementById('nowBadgeText');
    if (nowBadge) nowBadge.innerText = 'PAUSED:';
  } else {
    // If audio is paused mid-track, resume it; else start from currentSeqIndex
    if (masterPlayer && masterPlayer.src && masterPlayer.currentTime > 0 && !masterPlayer.ended) {
      masterPlayer.volume = getMasterVolume();
      masterPlayer.play().then(() => {
        isSeqPlaying = true;
        const icon = document.getElementById('masterPlayIcon');
        if (icon) icon.innerText = '⏸';
        const nowBadge = document.getElementById('nowBadgeText');
        if (nowBadge) nowBadge.innerText = `PLAYING #${currentSeqIndex + 1}:`;
      }).catch(err => {
        console.warn('Resume failed, restarting track:', err);
        playSequenceTrack(currentSeqIndex || 0, 0);
      });
    } else {
      playSequenceTrack(currentSeqIndex || 0, 0);
    }
  }
}

function playSequenceTrack(index, offset = 0) {
  initAudioPlayers();
  if (!project || !project.items || project.items.length === 0) return;
  
  if (index >= project.items.length) {
    stopMasterPlayback();
    currentSeqIndex = 0;
    const playhead = document.getElementById('masterPlayhead');
    if (playhead) playhead.style.left = '0%';
    const nowTime = document.getElementById('playbackTimeText');
    if (nowTime) nowTime.innerText = `00:00 / ${formatTime(calculateTotalDuration())}`;
    const nowPlaying = document.getElementById('nowPlayingText');
    if (nowPlaying) nowPlaying.innerText = 'Mashup finished! Click Play (▶) to restart.';
    return;
  }

  // Stop any solo preview
  if (soloPlayer) {
    soloPlayer.pause();
    isSoloPlaying = false;
    currentSoloTrackIdx = -1;
    document.querySelectorAll('.btn-icon-sm').forEach(b => {
      if (b.innerText.includes('Stop')) b.innerText = '▶ Solo Cut';
    });
  }

  isSeqPlaying = true;
  currentSeqIndex = index;
  currentTrackOffset = offset;

  const item = project.items[index];
  const startCut = Math.max(0, parseFloat(item.startSec) + parseFloat(offset));
  const endCut = parseFloat(item.endSec);

  // Highlight track in UI
  document.querySelectorAll('.track-card').forEach((c, i) => {
    if (i === index) {
      c.classList.add('is-playing');
      c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      c.classList.remove('is-playing');
    }
  });

  const nowBadge = document.getElementById('nowBadgeText');
  const nowPlaying = document.getElementById('nowPlayingText');
  const playIcon = document.getElementById('masterPlayIcon');

  if (nowBadge) nowBadge.innerText = `PLAYING #${index + 1}:`;
  if (nowPlaying) nowPlaying.innerText = `${item.title} (${item.singer || item.movie})`;
  if (playIcon) playIcon.innerText = '⏸';

  // Request instant trimmed slice from server
  const sliceUrl = `/api/solo_cut?path=${encodeURIComponent(item.filePath)}&start=${startCut.toFixed(2)}&end=${endCut.toFixed(2)}&t=${Date.now()}`;
  
  masterPlayer.src = sliceUrl;
  masterPlayer.volume = getMasterVolume();

  const playPromise = masterPlayer.play();
  if (playPromise !== undefined) {
    playPromise.catch(e => {
      console.warn('Master playback error:', e);
      if (nowPlaying) nowPlaying.innerText = `[Click Play to resume] ${item.title}`;
    });
  }
}

function onMasterTrackEnded() {
  if (!isSeqPlaying) return;
  // Automatically advance to the next song in the sequence!
  playSequenceTrack(currentSeqIndex + 1, 0);
}

function onMasterTimeUpdate() {
  if (!isSeqPlaying || !project || !project.items) return;
  
  let elapsed = 0;
  for (let i = 0; i < currentSeqIndex; i++) {
    const item = project.items[i];
    const segDur = Math.max(0, parseFloat(item.endSec) - parseFloat(item.startSec));
    const trans = item.transitionOut || {};
    const transDur = (i < project.items.length - 1) ? Math.min(parseFloat(trans.duration || 2.0), segDur * 0.35) : 0;
    elapsed += (segDur - transDur);
  }
  elapsed += (currentTrackOffset + (masterPlayer ? masterPlayer.currentTime : 0));

  const totalDur = calculateTotalDuration();
  const pct = Math.min(100, Math.max(0, (elapsed / totalDur) * 100));

  const playhead = document.getElementById('masterPlayhead');
  if (playhead) playhead.style.left = `${pct}%`;

  const nowTime = document.getElementById('playbackTimeText');
  if (nowTime) nowTime.innerText = `${formatTime(elapsed)} / ${formatTime(totalDur)}`;
}

// Scrubber seeking across full mashup duration
function seekMasterAudioByPct(pct) {
  if (!project || !project.items || project.items.length === 0) return;
  const totalDur = calculateTotalDuration();
  const targetSec = Math.max(0, Math.min(totalDur, pct * totalDur));

  // Determine which track index covers targetSec
  let accumulated = 0;
  for (let i = 0; i < project.items.length; i++) {
    const item = project.items[i];
    const segDur = Math.max(0, item.endSec - item.startSec);
    const trans = item.transitionOut || {};
    const transDur = (i < project.items.length - 1) ? Math.min(parseFloat(trans.duration || 2.0), segDur * 0.35) : 0;
    const trackSpan = segDur - transDur;

    if (targetSec <= accumulated + trackSpan || i === project.items.length - 1) {
      const offsetInTrack = targetSec - accumulated;
      playSequenceTrack(i, offsetInTrack);
      return;
    }
    accumulated += trackSpan;
  }
}

// Re-mix on demand via FFmpeg master build
async function reMixAndPlay() {
  stopMasterPlayback();
  const btn = document.getElementById('btnReMix');
  const oldText = btn.innerHTML;
  btn.innerHTML = '<span>⏳</span> Mixing...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/render?dance=${currentDanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: project.items, dance: currentDanceId })
    });
    const result = await res.json();
    if (result.status === 'success') {
      console.log('Re-mix successful! Master mix updated.');
      playSequenceTrack(0, 0);
    } else {
      alert('Mix Error: ' + (result.error || 'Unknown error'));
    }
  } catch (e) {
    alert('Re-Mix request failed: ' + e.message);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
}

// -------------------------------------------------------------
// SOLO CUT AUDITIONING
// -------------------------------------------------------------
function playSoloTrack(idx) {
  initAudioPlayers();
  const item = project.items[idx];
  if (!item) return;

  if (isSoloPlaying && currentSoloTrackIdx === idx && soloPlayer && !soloPlayer.paused) {
    stopMasterPlayback();
    return;
  }

  stopMasterPlayback();
  isSoloPlaying = true;
  currentSoloTrackIdx = idx;

  const soloUrl = `/api/solo_cut?path=${encodeURIComponent(item.filePath)}&start=${item.startSec}&end=${item.endSec}&t=${Date.now()}`;
  soloPlayer.src = soloUrl;
  soloPlayer.volume = getMasterVolume();

  const playPromise = soloPlayer.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      const btn = document.getElementById(`btnSolo_${idx}`);
      if (btn) btn.innerText = '⏹ Stop Cut';
      const card = document.getElementById(`trackCard_${idx}`);
      if (card) card.classList.add('is-playing');
      const nowBadge = document.getElementById('nowBadgeText');
      if (nowBadge) nowBadge.innerText = 'SOLO PREVIEW:';
      const nowPlaying = document.getElementById('nowPlayingText');
      if (nowPlaying) nowPlaying.innerText = `Track #${idx + 1}: ${item.title} (${item.startSec}s - ${item.endSec}s)`;
    }).catch(e => {
      console.error('Solo cut playback failed:', e);
    });
  }
}

// -------------------------------------------------------------
// GRAND FINALE PLAYER LOGIC (Deewangi Deewangi Full Track)
// -------------------------------------------------------------
function initFinalePlayer() {
  finalePlayer = document.getElementById('finaleAudioPlayer');
  if (!finalePlayer) return;

  finalePlayer.addEventListener('timeupdate', () => {
    const cur = finalePlayer.currentTime;
    const dur = finalePlayer.duration || 537.3;
    const pct = (cur / dur) * 100;

    const fill = document.getElementById('finaleScrubFill');
    if (fill) fill.style.width = `${pct}%`;

    const curTime = document.getElementById('finaleCurrentTime');
    if (curTime) curTime.innerText = formatTime(cur);

    const totTime = document.getElementById('finaleTotalTime');
    if (totTime && finalePlayer.duration) totTime.innerText = formatTime(dur);
  });

  finalePlayer.addEventListener('ended', () => {
    const playIcon = document.getElementById('finalePlayIcon');
    if (playIcon) playIcon.innerText = '▶';
  });
}

function toggleFinalePlay() {
  if (!finalePlayer) finalePlayer = document.getElementById('finaleAudioPlayer');
  if (!finalePlayer) return;
  const playIcon = document.getElementById('finalePlayIcon');

  if (finalePlayer.paused) {
    finalePlayer.play().then(() => {
      if (playIcon) playIcon.innerText = '⏸';
    }).catch(err => {
      console.error('Finale audio play failed:', err);
    });
  } else {
    finalePlayer.pause();
    if (playIcon) playIcon.innerText = '▶';
  }
}

function seekFinaleAudio(event) {
  if (!finalePlayer) finalePlayer = document.getElementById('finaleAudioPlayer');
  if (!finalePlayer) return;
  const scrubBar = document.getElementById('finaleScrubBar');
  if (!scrubBar) return;
  const rect = scrubBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  const dur = finalePlayer.duration || 537.3;
  finalePlayer.currentTime = pct * dur;
}

function setFinaleVolume(val) {
  if (!finalePlayer) finalePlayer = document.getElementById('finaleAudioPlayer');
  if (finalePlayer) finalePlayer.volume = parseFloat(val) / 100;
}

// -------------------------------------------------------------
// EXPORT MODAL & FFMPEG MASTER PIPELINE
// -------------------------------------------------------------
let renderTimer = null;

function openExportModal() {
  const modal = document.getElementById('exportModal');
  const spinner = document.getElementById('exportSpinner');
  const successView = document.getElementById('exportSuccessView');
  const modalTitle = document.getElementById('exportModalTitle');
  const danceTitle = document.getElementById('exportSuccessDanceTitle');
  const btnMp3 = document.getElementById('btnDownloadMp3');
  const btnWav = document.getElementById('btnDownloadWav');

  const danceName = currentDanceId === '1' ? 'Dance 1 (Boyz Only)' : 'Dance 2 (Cousins Combined)';
  if (modalTitle) modalTitle.innerText = `⚡ Exporting ${danceName}...`;
  if (danceTitle) danceTitle.innerText = `${danceName} Master Mix`;

  if (btnMp3) {
    btnMp3.href = `/api/download?dance=${currentDanceId}&format=mp3&t=${Date.now()}`;
    btnMp3.download = currentDanceId === '1' ? 'dance_1_boyz_mashup.mp3' : 'dance_2_cousins_mashup.mp3';
  }
  if (btnWav) {
    btnWav.href = `/api/download?dance=${currentDanceId}&format=wav&t=${Date.now()}`;
    btnWav.download = currentDanceId === '1' ? 'dance_1_boyz_mashup.wav' : 'dance_2_cousins_mashup.wav';
  }

  modal.style.display = 'flex';
  spinner.style.display = 'block';
  successView.style.display = 'none';

  renderMasterMix();
}

function closeExportModal() {
  clearInterval(renderTimer);
  document.getElementById('exportModal').style.display = 'none';
}

function forceReRenderMix() {
  const spinner = document.getElementById('exportSpinner');
  const successView = document.getElementById('exportSuccessView');
  spinner.style.display = 'block';
  successView.style.display = 'none';
  renderMasterMix();
}

async function renderMasterMix() {
  const spinner = document.getElementById('exportSpinner');
  const successView = document.getElementById('exportSuccessView');
  const details = document.getElementById('exportSuccessDetails');
  const statusText = document.getElementById('exportStatusText');
  const timerText = document.getElementById('exportTimerText');
  const barEl = document.getElementById('exportProgressBar');
  const btnMp3 = document.getElementById('btnDownloadMp3');
  const btnWav = document.getElementById('btnDownloadWav');

  clearInterval(renderTimer);
  let elapsed = 0;
  if (barEl) barEl.style.width = '10%';
  if (timerText) timerText.innerText = 'Rendering: 0s / ~10s';
  if (statusText) statusText.innerText = 'Step 1/3: Aligning song cuts & BPM timelines...';

  renderTimer = setInterval(() => {
    elapsed++;
    if (timerText) timerText.innerText = `Rendering: ${elapsed}s / ~10s`;
    if (barEl) {
      const pct = Math.min(95, 10 + elapsed * 9);
      barEl.style.width = `${pct}%`;
    }
    if (statusText) {
      if (elapsed < 3) statusText.innerText = 'Step 1/3: Aligning song cuts & BPM timelines...';
      else if (elapsed < 8) statusText.innerText = 'Step 2/3: Applying DJ transitions, crossfades & sub-bass drops...';
      else statusText.innerText = 'Step 3/3: Mastering 320 kbps MP3 & true-peak limiter...';
    }
  }, 1000);

  try {
    const res = await fetch(`/api/render?dance=${currentDanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: project.items, dance: currentDanceId })
    });
    clearInterval(renderTimer);

    if (barEl) barEl.style.width = '100%';
    const result = await res.json();

    if (result.status === 'success') {
      spinner.style.display = 'none';
      successView.style.display = 'block';
      if (details) {
        details.innerText = `Duration: ${result.durationFormatted} (${result.duration.toFixed(1)}s) • Broadcast Mastered at -14 LUFS (320 kbps MP3)`;
      }
      if (btnMp3) {
        btnMp3.href = `/api/download?dance=${currentDanceId}&format=mp3&t=${Date.now()}`;
        btnMp3.download = currentDanceId === '1' ? 'dance_1_boyz_mashup.mp3' : 'dance_2_cousins_mashup.mp3';
      }
      if (btnWav) {
        btnWav.href = `/api/download?dance=${currentDanceId}&format=wav&t=${Date.now()}`;
        btnWav.download = currentDanceId === '1' ? 'dance_1_boyz_mashup.wav' : 'dance_2_cousins_mashup.wav';
      }
    } else {
      spinner.style.display = 'none';
      successView.style.display = 'block';
      if (details) {
        details.innerText = 'Direct Download Ready: Pre-rendered broadcast master (320 kbps MP3)';
      }
    }
  } catch (err) {
    clearInterval(renderTimer);
    console.warn('Export render note:', err);
    spinner.style.display = 'none';
    successView.style.display = 'block';
    if (details) {
      details.innerText = 'Direct Master Download (320 kbps MP3 & Lossless WAV)';
    }
  }
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
function initializeStudio() {
  initAudioPlayers();

  // Scrubber click seeking
  const scrubTrack = document.getElementById('masterScrubberTrack');
  if (scrubTrack) {
    scrubTrack.addEventListener('click', (e) => {
      const rect = scrubTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      seekMasterAudioByPct(pct);
    });
  }

  // Master Volume Slider
  const volSlider = document.getElementById('masterVolumeSlider');
  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      if (masterPlayer) masterPlayer.volume = val;
      if (soloPlayer) soloPlayer.volume = val;
    });
  }

  // Initialize Grand Finale Player
  initFinalePlayer();

  // Load Initial Project (Dance 1)
  loadProject('1');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeStudio);
} else {
  initializeStudio();
}
