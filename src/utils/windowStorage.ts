export interface WindowMaxUsersConfig {
  [windowId: number]: number;
}

export interface GlobalDisplayConfig {
  maxUsers: number;
  pollingInterval: number; // en segundos
}

const STORAGE_KEY = 'windowMaxUsers';
const GLOBAL_CONFIG_KEY = 'globalDisplayConfig';

export const getGlobalDisplayConfig = (): GlobalDisplayConfig => {
  if (typeof window === 'undefined') return { maxUsers: 10, pollingInterval: 10 };
  
  try {
    const stored = localStorage.getItem(GLOBAL_CONFIG_KEY);
    return stored ? JSON.parse(stored) : { maxUsers: 10, pollingInterval: 10 };
  } catch (error) {
    console.error('Error al leer configuración global:', error);
    return { maxUsers: 10, pollingInterval: 10 };
  }
};

export const setGlobalDisplayConfig = (config: GlobalDisplayConfig): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(GLOBAL_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error al guardar configuración global:', error);
  }
};

export const getGlobalMaxUsers = (): number => {
  const config = getGlobalDisplayConfig();
  return config.maxUsers;
};

export const updateGlobalMaxUsers = (maxUsers: number): void => {
  const config = getGlobalDisplayConfig();
  config.maxUsers = maxUsers;
  setGlobalDisplayConfig(config);
};

export const getGlobalPollingInterval = (): number => {
  const config = getGlobalDisplayConfig();
  return config.pollingInterval;
};

export const updateGlobalPollingInterval = (seconds: number): void => {
  const config = getGlobalDisplayConfig();
  config.pollingInterval = seconds;
  setGlobalDisplayConfig(config);
};

export const getMaxUsersConfig = (): WindowMaxUsersConfig => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error al leer configuración de maxUsers:', error);
    return {};
  }
};

export const setMaxUsersConfig = (config: WindowMaxUsersConfig): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error al guardar configuración de maxUsers:', error);
  }
};

export const getMaxUsersForWindow = (windowId: number): number => {
  return getGlobalMaxUsers();
};

export const updateMaxUsersForWindow = (windowId: number, maxUsers: number): void => {
  updateGlobalMaxUsers(maxUsers);
};

export const removeMaxUsersForWindow = (windowId: number): void => {
};
