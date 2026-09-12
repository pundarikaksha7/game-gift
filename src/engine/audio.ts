import type { Game } from '../../shared/schema';
export class GameAudio {
  private music?: HTMLAudioElement;
  private context?: AudioContext;
  private clips: HTMLAudioElement[] = [];
  constructor(private sounds: Game['sounds']) {}
  start() {
    if (this.sounds.music) {
      this.music = new Audio(this.sounds.music);
      this.music.loop = true;
      this.music.volume = this.sounds.volume;
      void this.music.play().catch(() => {});
    }
  }
  play(key: 'jump' | 'hit' | 'win') {
    if (this.sounds.volume === 0) return;
    if (this.sounds[key]) {
      const clip = new Audio(this.sounds[key]);
      clip.volume = this.sounds.volume;
      this.clips.push(clip);
      clip.onended = () => {
        this.clips = this.clips.filter((c) => c !== clip);
      };
      void clip.play().catch(() => {});
      return;
    }
    try {
      this.context ??= new AudioContext();
      const osc = this.context.createOscillator(),
        gain = this.context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(
        key === 'jump' ? 380 : key === 'hit' ? 140 : 650,
        this.context.currentTime,
      );
      osc.frequency.exponentialRampToValueAtTime(
        key === 'jump' ? 700 : 80,
        this.context.currentTime + 0.15,
      );
      gain.gain.setValueAtTime(this.sounds.volume * 0.12, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.2);
      osc.connect(gain).connect(this.context.destination);
      osc.start();
      osc.stop(this.context.currentTime + 0.2);
    } catch {}
  }
  dispose() {
    this.music?.pause();
    this.clips.forEach((c) => c.pause());
    void this.context?.close();
  }
}
