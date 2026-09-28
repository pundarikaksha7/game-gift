import type { Game } from '../../shared/schema';
export class GameAudio {
  private music?: HTMLAudioElement;
  private clips = new Map<'jump' | 'hit' | 'win', HTMLAudioElement[]>();
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
      const pool = this.clips.get(key) || [];
      let clip = pool.find((candidate) => candidate.paused || candidate.ended);
      if (!clip && pool.length < 4) {
        clip = new Audio(this.sounds[key]);
        clip.preload = 'auto';
        pool.push(clip);
        this.clips.set(key, pool);
      }
      clip ||= pool[0];
      clip.pause();
      try {
        clip.currentTime = 0;
      } catch {
        // Some browsers reject seeking until metadata is ready; play still works.
      }
      clip.volume = this.sounds.volume;
      void clip.play().catch(() => {});
      return;
    }
  }
  dispose() {
    this.music?.pause();
    this.clips.forEach((pool) =>
      pool.forEach((clip) => {
        clip.pause();
        clip.removeAttribute('src');
        clip.load();
      }),
    );
    this.clips.clear();
  }
}
