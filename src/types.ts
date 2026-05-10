export interface Emote {
  name: string;
  id: string;
}

export type TabType = 0 | 1 | 2; // Evo, All, Rear

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
}
