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

  public playClick() {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    
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
}

export const audio = new AudioSystem();
