export interface WindowMaxUsersConfig {
  [windowId: number]: number;
}

export interface GlobalDisplayConfig {
  maxUsers: number;
  pollingInterval: number; // en segundos
  queueMode: boolean;
  callSlots: number;
}

export const DEFAULT_CALL_SLOTS = 4;
export const MIN_CALL_SLOTS = 1;
export const MAX_CALL_SLOTS = 12;

const STORAGE_KEY = 'windowMaxUsers';
const GLOBAL_CONFIG_KEY = 'globalDisplayConfig';

const defaultGlobalConfig = (): GlobalDisplayConfig => ({
  maxUsers: 10,
  pollingInterval: 10,
  queueMode: true,
  callSlots: DEFAULT_CALL_SLOTS,
});

const clampCallSlots = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(MAX_CALL_SLOTS, Math.max(MIN_CALL_SLOTS, Math.round(value)))
    : DEFAULT_CALL_SLOTS;

export const getGlobalDisplayConfig = (): GlobalDisplayConfig => {
  if (typeof window === 'undefined') return defaultGlobalConfig();
  
  try {
    const stored = localStorage.getItem(GLOBAL_CONFIG_KEY);
    if (!stored) return defaultGlobalConfig();
    const merged = { ...defaultGlobalConfig(), ...JSON.parse(stored) };
    return {
      ...merged,
      callSlots: clampCallSlots(merged.callSlots),
      queueMode: typeof merged.queueMode === 'boolean' ? merged.queueMode : true,
    };
  } catch (error) {
    console.error('Error al leer configuración global:', error);
    return defaultGlobalConfig();
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

export const getQueueMode = (): boolean => getGlobalDisplayConfig().queueMode;

export const setQueueMode = (value: boolean): void => {
  const config = getGlobalDisplayConfig();
  config.queueMode = value;
  setGlobalDisplayConfig(config);
};

export const getCallSlots = (): number => getGlobalDisplayConfig().callSlots;

export const setCallSlots = (value: number): void => {
  const config = getGlobalDisplayConfig();
  config.callSlots = clampCallSlots(value);
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
