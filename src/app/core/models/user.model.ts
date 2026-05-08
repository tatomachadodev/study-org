export interface UserPreferences {
  theme: 'light' | 'dark';
  emailNotifications: boolean;
  pushNotifications: boolean;
  dailySummary: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
}
