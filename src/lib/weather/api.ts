import { WeatherData } from '@/types/weather';

export const fetchWeather = async (location: string): Promise<WeatherData> => {
    const weatherResponse = await fetch(`/api/weather?city=${encodeURIComponent(location)}`);

    if (!weatherResponse.ok) {
        const status = weatherResponse.status;
        if (status === 404) {
            throw new Error(`找不到城市 ${location} 的天气数据`);
        } else {
            throw new Error(`天气数据获取失败 - HTTP状态码: ${status}`);
        }
    }

    const data = await weatherResponse.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return {
        location: data.location || location,
        temperature: data.temp,
        condition: data.text,
        icon: data.icon,
        tempMin: data.tempMin,
        tempMax: data.tempMax
    };
};

export const fetchAirQuality = async (location: string, coords?: { latitude: number; longitude: number }): Promise<Partial<WeatherData>> => {
    const airUrl = coords?.latitude && coords?.longitude
        ? `/api/weather/air?lat=${coords.latitude}&lon=${coords.longitude}`
        : `/api/weather/air?location=${encodeURIComponent(location)}`;

    const airResponse = await fetch(airUrl);

    if (airResponse.ok) {
        const airData = await airResponse.json();

        if (!airData.error) {
            return {
                aqi: airData.aqi,
                aqiDisplay: airData.aqiDisplay,
                aqiLevel: airData.level,
                aqiCategory: airData.category,
                aqiColor: airData.color,
                primaryPollutant: airData.primaryPollutant
            };
        }
    }
    return {}; // Quietly fail if air quality is unavailable
};
