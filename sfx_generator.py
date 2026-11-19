"""
Bollywood DJ Studio - Transition Sound Effects Generator
Generates pristine studio-grade DJ sound effects using pure Python wave & math.
No external dependencies required.
"""
import os
import wave
import math
import struct
import random

SFX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sfx")
os.makedirs(SFX_DIR, exist_ok=True)
SAMPLE_RATE = 44100

def write_wav(filename, samples_left, samples_right):
    filepath = os.path.join(SFX_DIR, filename)
    num_frames = len(samples_left)
    with wave.open(filepath, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2) # 16-bit
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for i in range(num_frames):
            l = max(-32767, min(32767, int(samples_left[i] * 32767)))
            r = max(-32767, min(32767, int(samples_right[i] * 32767)))
            frames.extend(struct.pack("<hh", l, r))
        wf.writeframes(frames)
    print(f"Generated: {filename} ({num_frames / SAMPLE_RATE:.2f}s)")

def generate_sub_bass_drop():
    # 2.0s cinematic sub drop (130Hz -> 35Hz exponential descent with heavy resonance)
    duration = 2.0
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    phase = 0.0
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Exponential frequency decay
        freq = 38.0 + (130.0 - 38.0) * math.exp(-3.5 * t)
        phase += 2.0 * math.pi * freq / SAMPLE_RATE
        # Amplitude envelope: punchy attack, lingering sub tail
        env = math.exp(-1.8 * t) if t > 0.005 else (t / 0.005)
        # Add slight 2nd harmonic warmth
        val = 0.85 * math.sin(phase) + 0.15 * math.sin(phase * 2)
        samples.append(val * env * 0.95)
    write_wav("bass_drop_impact.wav", samples, samples)

def generate_white_noise_riser():
    # 3.0s DJ sweep riser with accelerating pulse and high-frequency opening
    duration = 3.0
    num_samples = int(duration * SAMPLE_RATE)
    samples_l = []
    samples_r = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration # 0.0 to 1.0
        # Rising filter cutoff simulated by frequency modulation
        pulse_rate = 2.0 + 16.0 * (progress ** 2)
        tremolo = 0.6 + 0.4 * math.sin(2.0 * math.pi * pulse_rate * t)
        # White noise
        noise_l = (random.random() * 2.0 - 1.0)
        noise_r = (random.random() * 2.0 - 1.0)
        # Rising pitch synth layer
        synth_freq = 250.0 * math.pow(8.0, progress)
        synth_l = math.sin(2.0 * math.pi * synth_freq * t)
        synth_r = math.cos(2.0 * math.pi * synth_freq * t)
        
        # Envelope: builds up smoothly, sharp drop in final 0.1s
        if progress < 0.95:
            env = (progress ** 1.8)
        else:
            env = max(0.0, 1.0 - (progress - 0.95) / 0.05)
            
        val_l = (noise_l * 0.4 + synth_l * 0.6) * tremolo * env * 0.9
        val_r = (noise_r * 0.4 + synth_r * 0.6) * tremolo * env * 0.9
        samples_l.append(val_l)
        samples_r.append(val_r)
    write_wav("edm_riser_sweep.wav", samples_l, samples_r)

def generate_dj_scratch_spinback():
    # 1.4s vinyl rewind / spinback scratching effect
    duration = 1.4
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    phase = 0.0
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Turntable deceleration curve
        speed = max(0.01, (1.0 - t / duration) ** 2)
        freq = 150.0 + 1800.0 * speed
        phase += 2.0 * math.pi * freq / SAMPLE_RATE
        
        # Scratching friction modulation
        friction = math.sin(2.0 * math.pi * 32.0 * (t ** 0.8))
        noise = (random.random() * 2.0 - 1.0) * 0.25
        
        env = math.exp(-1.8 * t)
        val = (math.sin(phase) * 0.65 + friction * 0.2 + noise) * env * 0.85
        samples.append(val)
    write_wav("dj_scratch_spinback.wav", samples, samples)

def generate_dhol_roll():
    # 2.5s authentic Punjabi Dhol burst (accelerating bass dagga + sharp treble tilli)
    duration = 2.5
    num_samples = int(duration * SAMPLE_RATE)
    samples_l = [0.0] * num_samples
    samples_r = [0.0] * num_samples
    
    # Generate rhythmic strikes accelerating in tempo
    # Beats: 4 quarter notes, 8 eighth notes, 16 sixteenth notes, then 32nd roll & crash!
    strikes = []
    cur_t = 0.0
    intervals = [0.25, 0.25, 0.25, 0.25,  0.15, 0.15, 0.15, 0.15,  0.08, 0.08, 0.08, 0.08, 0.06, 0.06, 0.06, 0.06]
    for interval in intervals:
        if cur_t < 2.0:
            strikes.append((cur_t, 1.0 if len(strikes) % 2 == 0 else 0.7))
            cur_t += interval
    # Rapid crescendo roll from 2.0 to 2.4
    for r in range(20):
        t_roll = 2.0 + r * 0.02
        strikes.append((t_roll, 0.4 + 0.6 * (r / 20.0)))
    
    for strike_t, strike_vol in strikes:
        start_idx = int(strike_t * SAMPLE_RATE)
        # Bass hit (Dagga)
        d_len = int(0.12 * SAMPLE_RATE)
        for j in range(d_len):
            idx = start_idx + j
            if idx < num_samples:
                tj = j / SAMPLE_RATE
                f = 75.0 * math.exp(-25.0 * tj) + 55.0
                env = math.exp(-30.0 * tj)
                hit = math.sin(2.0 * math.pi * f * tj) * env * strike_vol * 0.7
                # Tilli (treble slap)
                tilli = (random.random() * 2.0 - 1.0) * math.exp(-90.0 * tj) * strike_vol * 0.5
                samples_l[idx] += (hit + tilli)
                samples_r[idx] += (hit - tilli * 0.7)
                
    # Normalize
    max_val = max(max(abs(x) for x in samples_l), max(abs(y) for y in samples_r), 1.0)
    samples_l = [x / max_val * 0.95 for x in samples_l]
    samples_r = [y / max_val * 0.95 for y in samples_r]
    write_wav("dhol_roll_drop.wav", samples_l, samples_r)

def generate_wedding_cheer():
    # 3.2s wedding crowd celebration cheer & reverb
    duration = 3.2
    num_samples = int(duration * SAMPLE_RATE)
    samples_l = []
    samples_r = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        noise_l = (random.random() * 2.0 - 1.0)
        noise_r = (random.random() * 2.0 - 1.0)
        # Envelope: swell then sustain
        if t < 0.8:
            env = (t / 0.8) ** 1.5
        elif t < 2.0:
            env = 1.0
        else:
            env = max(0.0, 1.0 - (t - 2.0) / 1.2)
        # Whistle tone
        whistle = 0.2 * math.sin(2.0 * math.pi * 1850.0 * t) * (0.5 + 0.5 * math.sin(2.0 * math.pi * 8.0 * t))
        samples_l.append((noise_l * 0.5 + whistle) * env * 0.7)
        samples_r.append((noise_r * 0.5 - whistle) * env * 0.7)
    write_wav("wedding_crowd_cheer.wav", samples_l, samples_r)

def generate_all():
    print("Generating studio transition assets...")
    generate_sub_bass_drop()
    generate_white_noise_riser()
    generate_dj_scratch_spinback()
    generate_dhol_roll()
    generate_wedding_cheer()
    print("Done! All transition assets ready.")

if __name__ == "__main__":
    generate_all()
