import { DEFAULT_NOTIFICATION_PREFS, NotificationPrefs } from '../notifications/planner';

export interface UserPreferences extends NotificationPrefs {
  theme: 'light' | 'dark' | 'system';
  dietaryRestrictions: string[];
  customLocations: string[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  dietaryRestrictions: [],
  customLocations: [],
  ...DEFAULT_NOTIFICATION_PREFS,
};
