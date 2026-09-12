import type { Game } from '../../../shared/schema';
export type EditorProps = {
  game: Game;
  change: (fn: (g: Game) => void) => void;
  notify: (s: string) => void;
  authed: boolean;
};
