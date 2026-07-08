export interface GeoCoordinates {
    latitude: number;
    longitude: number;
}

export const getCurrentPosition = async (): Promise<GeolocationPosition> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
        throw new Error('Geolocation is not supported');
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 600000, // 10 minutes cache
        });
    });
};

export const getLocationFromGeo = async (coords: GeoCoordinates): Promise<string | null> => {
    const { latitude, longitude } = coords;
    try {
        const response = await fetch(`/api/weather/geo?lat=${latitude}&lon=${longitude}`);
        if (!response.ok) return null;

        const data = await response.json();
        if (data.location && data.location !== '未知位置') {
            return data.location;
        }
        return null;
    } catch (error) {
        console.error('Failed to get location from geo:', error);
        return null;
    }
}

export const getLocationFromIp = async (): Promise<{ location: string; coords?: GeoCoordinates } | null> => {
    try {
        const response = await fetch('/api/weather/ip');
        if (!response.ok) return null;

        const data = await response.json();
        if (data.location && data.location !== '未知位置') {
            const result: { location: string; coords?: GeoCoordinates } = { location: data.location };
            if (data.latitude && data.longitude) {
                result.coords = { latitude: data.latitude, longitude: data.longitude };
            }
            return result;
        }
        return null;
    } catch (error) {
        console.error('Failed to get location from IP:', error);
        return null;
    }
};
