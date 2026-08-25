export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  dietaryRestrictions: string[];
  customLocations: string[];
  notificationsEnabled: boolean;
  expiryAlertDays: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  dietaryRestrictions: [],
  customLocations: [],
  notificationsEnabled: true,
  expiryAlertDays: 7,
};
