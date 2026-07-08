const CITY_STORAGE_KEY = 'weatherCity';

export const getStoredCity = (): string | null => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    return localStorage.getItem(CITY_STORAGE_KEY);
};

export const setStoredCity = (city: string): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    localStorage.setItem(CITY_STORAGE_KEY, city);
};

export const clearStoredCity = (): void => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    localStorage.removeItem(CITY_STORAGE_KEY);
};
