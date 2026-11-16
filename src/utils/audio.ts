// Audio utilities for TimeNest using Web Audio API

class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private activeOscillators: OscillatorNode[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.5;
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playClick() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.resume();
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playTick() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.01);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(t);
    osc.stop(t + 0.01);
  }

  /**
   * Authentic iOS-Style Unlock Sound
   * Synthesizes the iconic mechanical dual-impulse polymer/wood latch click
   */
  public playIosUnlock() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // Transient 1: Initial high mechanical latch tick (t = 0)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(2600, t);
    filter1.Q.setValueAtTime(4, t);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(2800, t);
    osc1.frequency.exponentialRampToValueAtTime(1200, t + 0.012);

    gain1.gain.setValueAtTime(0.45, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start(t);
    osc1.stop(t + 0.018);

    // Transient 2: Main crisp acoustic unlock pop (t = 30ms)
    const t2 = t + 0.030;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const filter2 = ctx.createBiquadFilter();

    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(1400, t2);
    filter2.Q.setValueAtTime(3.5, t2);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1600, t2);
    osc2.frequency.exponentialRampToValueAtTime(380, t2 + 0.035);

    gain2.gain.setValueAtTime(0.85, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.masterGain);

    osc2.start(t2);
    osc2.stop(t2 + 0.045);

    // Subtle low body thump for realism (t = 30ms)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(280, t2);
    osc3.frequency.exponentialRampToValueAtTime(80, t2 + 0.025);
    gain3.gain.setValueAtTime(0.35, t2);
    gain3.gain.exponentialRampToValueAtTime(0.001, t2 + 0.03);
    osc3.connect(gain3);
    gain3.connect(this.masterGain);
    osc3.start(t2);
    osc3.stop(t2 + 0.035);
  }

  public playChimeDone() {
    const ctx = this.ctx;
    const masterGain = this.masterGain;
    if (!this.enabled || !ctx || !masterGain) return;
    
    const t = ctx.currentTime;
    // Arpeggio
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = t + (i * 0.1);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(startTime);
      osc.stop(startTime + 1.0);
    });
  }

  public stopAmbient() {
    if (this.ambientNoiseSource) {
      try {
        this.ambientNoiseSource.stop();
        this.ambientNoiseSource.disconnect();
      } catch (e) {
        // Ignorar erros caso já tenha parado
      }
      this.ambientNoiseSource = null;
    }
    
    // Para qualquer oscilador gerado proceduralmente ativo
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch(e) {}
    });
    this.activeOscillators = [];
  }

  public vibrate(pattern: 'normal' | 'critical' | 'task' = 'normal') {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (pattern === 'normal') {
        navigator.vibrate([200, 100, 200]); // buzz - pause - buzz
      } else if (pattern === 'task') {
        navigator.vibrate([200, 50, 200]); // buzz buzz
      } else if (pattern === 'critical') {
        navigator.vibrate([300, 100, 300, 100, 300]); // buzz - buzz - buzz
      }
    }
  }

  public playAmbient(type: 'rain' | 'waves' | 'cafe' | 'forest', volume: number = 0.3) {
    this.stopAmbient();
    if (!this.enabled || !this.ctx || !this.masterGain || volume <= 0) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    
    if (type === 'rain') {
      // White noise processado para soar como chuva
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      noise.start(t);
      this.ambientNoiseSource = noise;
    } else {
      // Implementação simplificada procedimental genérica para outros tipos
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = type === 'forest' ? 200 : (type === 'waves' ? 100 : 150);
      
      // LFO for modulation
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.2; // 0.2 Hz = 5s cycle
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = type === 'waves' ? 50 : 20;
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      gain.gain.value = volume * 0.5;
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      lfo.start(t);
      osc.start(t);
      
      this.activeOscillators.push(osc, lfo);
    }
  }

  public ensureAudioUnlocked() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      const unlock = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  private alarmInterval: any = null;
  private isAlarmPlaying: boolean = false;

  public playAlarm(sound: 'chime' | 'rain' | 'waves' | 'cafe' | 'forest' | 'radar' | 'gentle' = 'chime', isCritical: boolean = false) {
    this.stopAlarm();
    this.ensureAudioUnlocked();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.isAlarmPlaying = true;

    // Ambient loop sounds
    if (sound === 'rain' || sound === 'waves' || sound === 'forest' || sound === 'cafe') {
      this.playAmbient(sound, isCritical ? 0.7 : 0.45);
      return;
    }

    // Procedural tones
    const playNote = () => {
      if (!this.isAlarmPlaying || !this.enabled || !this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      
      const t = this.ctx.currentTime;

      if (sound === 'radar') {
        // High-clarity 2-pulse alert
        const freqs = [880, 1320];
        freqs.forEach((freq, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.12);
          
          gain.gain.setValueAtTime(0, t + idx * 0.12);
          gain.gain.linearRampToValueAtTime(isCritical ? 0.4 : 0.25, t + idx * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.18);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t + idx * 0.12);
          osc.stop(t + idx * 0.12 + 0.2);
        });
      } else if (sound === 'gentle') {
        // Soft acoustic kalimba tones (A4, C#5, E5, G#5)
        const freqs = [440.00, 554.37, 659.25, 830.61];
        freqs.forEach((freq, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.15);
          
          gain.gain.setValueAtTime(0, t + idx * 0.15);
          gain.gain.linearRampToValueAtTime(0.2, t + idx * 0.15 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.15 + 1.2);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t + idx * 0.15);
          osc.stop(t + idx * 0.15 + 1.25);
        });
      } else {
        // Default: Chime arpeggio
        this.playChimeDone();
      }
    };

    playNote();
    const intervalMs = isCritical ? 2000 : (sound === 'radar' ? 2500 : 3500);
    this.alarmInterval = setInterval(playNote, intervalMs);
  }

  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    this.stopAmbient();
  }

  public previewSound(sound: 'chime' | 'rain' | 'waves' | 'cafe' | 'forest' | 'radar' | 'gentle') {
    this.playAlarm(sound, false);
    setTimeout(() => {
      this.stopAlarm();
    }, 2800);
  }

  public playCelebration() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + (i * 0.08);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.85);
    });
  }
}

export const audio = new AudioSystem();
