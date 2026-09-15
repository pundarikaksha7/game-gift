import type { Game } from '../../shared/schema';
export class GameAudio {
  private music?: HTMLAudioElement;
  private clips: HTMLAudioElement[] = [];
  private started = false;
  constructor(private sounds: Game['sounds']) {}
  start() {
    if (this.started) return;
    this.started = true;
    if (this.sounds.music) {
      this.music = new Audio(this.sounds.music);
      this.music.loop = true;
      this.music.volume = this.sounds.volume;
      void this.music.play().catch(() => {});
    }
  }
  play(key: 'jump' | 'hit' | 'win') {
    if (this.sounds.volume === 0 || !this.sounds[key]) return;
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
  }
  dispose() {
    this.music?.pause();
    this.clips.forEach((c) => c.pause());
  }
}
