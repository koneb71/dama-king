import type { Color } from '@/game/types';

export type LobbyGameRow = {
  id: string;
  red_player_id: string | null;
  black_player_id: string | null;
  current_turn: Color;
  status: 'waiting' | 'active' | 'finished';
  winner_id?: string | null;
  room_code: string | null;
  is_public: boolean;
  is_ranked: boolean;
  best_of?: 1 | 3 | 5;
  created_at: string;
  updated_at: string;
};

