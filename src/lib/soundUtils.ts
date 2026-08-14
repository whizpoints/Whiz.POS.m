/**
 * Utility for playing UI sound effects using Web Audio API.
 * This avoids dependency on external audio files.
 */

class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.playTone(800, 'sine', 0.1, 0.1);
  }

  playSuccess() {
    this.playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(900, 'sine', 0.2, 0.1), 100);
  }

  playError() {
    this.playTone(300, 'sawtooth', 0.2, 0.1);
  }

  playPop() {
    this.playTone(1200, 'sine', 0.05, 0.1);
  }

  playCheckout() {
    this.playTone(1000, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1500, 'sine', 0.3, 0.1), 100);
  }
}

export const soundManager = new SoundManager();
