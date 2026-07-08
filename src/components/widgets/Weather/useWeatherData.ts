import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '@/types/weather';
import { fetchWeather, fetchAirQuality } from '@/lib/weather/api';
import { getCurrentPosition, getLocationFromGeo, getLocationFromIp } from '@/lib/weather/geolocation';
import { getStoredCity, setStoredCity } from '@/lib/weather/storage';

interface UseWeatherDataReturn {
    weatherData: WeatherData | null;
    loading: boolean;
    error: string | null;
    currentCity: string;
    isRefreshing: boolean;
    refreshWeather: () => void;
    updateCity: (city: string) => void;
}

export function useWeatherData(defaultCity: string = '杭州'): UseWeatherDataReturn {
    const [mounted, setMounted] = useState(false);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentCity, setCurrentCity] = useState(defaultCity);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const loadWeatherData = useCallback(async (city: string, isAuto: boolean) => {
        if (!mounted) return;

        setLoading(true);
        setError(null);
        if (isAuto) setIsRefreshing(true);

        try {
            let location = city;
            let latitude: number | null = null;
            let longitude: number | null = null;

            // 1. Determine Location
            if (isAuto) {
                location = defaultCity; // Fallback

                try {
                    // Try Browser Geolocation
                    const position = await getCurrentPosition();
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;

                    const geoLocation = await getLocationFromGeo({ latitude, longitude });
                    if (geoLocation) {
                        location = geoLocation;
                    } else {
                        // Fallback to IP
                        const ipData = await getLocationFromIp();
                        if (ipData) {
                            location = ipData.location;
                            if (ipData.coords) {
                                latitude = ipData.coords.latitude;
                                longitude = ipData.coords.longitude;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Geolocation failed, falling back to IP/Default", e);
                    // Fallback to IP
                    const ipData = await getLocationFromIp();
                    if (ipData) {
                        location = ipData.location;
                        if (ipData.coords) {
                            latitude = ipData.coords.latitude;
                            longitude = ipData.coords.longitude;
                        }
                    }
                }
            } else {
                // Manual city (already set in location variable)
                // We don't have coords for manual city unless we geocode it, but the API handles city names.
                setStoredCity(location);
            }

            setCurrentCity(location);

            // 2. Fetch Data
            const weather = await fetchWeather(location);

            // 3. Fetch Air Quality (Enhancement)
            const airData = await fetchAirQuality(location, (latitude && longitude) ? { latitude, longitude } : undefined);

            setWeatherData({ ...weather, ...airData });

        } catch (err) {
            console.error('Failed to load weather data:', err);
            setError(err instanceof Error ? err.message : '未知错误');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [defaultCity, mounted]);

    // Initial Load & Auto Refresh
    useEffect(() => {
        if (!mounted) return;

        const storedCity = getStoredCity();
        if (storedCity) {
            loadWeatherData(storedCity, false);
        } else {
            loadWeatherData('auto', true);
        }

        const intervalId = setInterval(() => {
            const latestCity = getStoredCity();
            if (latestCity) {
                loadWeatherData(latestCity, false);
            } else {
                loadWeatherData('auto', true);
            }
        }, 30 * 60 * 1000); // 30 minutes

        return () => clearInterval(intervalId);
    }, [mounted, loadWeatherData]);

    const refreshWeather = () => {
        loadWeatherData('auto', true);
    };

    const updateCity = (city: string) => {
        loadWeatherData(city, false);
    };

    return {
        weatherData,
        loading,
        error,
        currentCity,
        isRefreshing,
        refreshWeather,
        updateCity
    };
}
