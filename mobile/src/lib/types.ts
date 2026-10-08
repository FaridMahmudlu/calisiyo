export type Alan = 'sayisal' | 'esit_agirlik' | 'sozel' | 'dil';

export type StudyPreferences = {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  dailyPlan?: boolean;
  repeats?: boolean;
  pomodoro?: boolean;
};

export type Profile = {
  id: string;
  full_name: string | null;
  alan_secimi: Alan | null;
  yks_year: number | null;
  notifications_enabled?: boolean | null;
  study_preferences?: StudyPreferences | null;
  study_goals?: Record<string, any> | null;
  study_goals_updated_at?: string | null;
  account_status?: string | null;
  username?: string | null;
  [key: string]: unknown;
};

export type CurrentPlan = {
  code: string;
  name: string;
  status: string;
  entitlements: Record<string, number | boolean | null>;
  [key: string]: unknown;
};

export type AccountStats = {
  level: number;
  xp: number;
  totalXp: number;
  levelTitle: string;
  progressPercent: number;
  xpToNext: number;
  streak: number;
  todayMinutes: number;
};

export type AccountPayload = {
  ok: true;
  user: { id: string; email: string; user_metadata: Record<string, any> };
  profile: Profile;
  progress: { level?: number; currentLevelXp?: number; totalXp?: number; title?: string; progressPercent?: number; xpToNext?: number } | null;
  adminRole: string | null;
  liveStreak: { streak?: number; todayMinutes?: number } | null;
  currentPlan: CurrentPlan;
  contentProducer: { active: boolean; status: string; [key: string]: unknown };
  partial: boolean;
};
