export type AqiCategory = '优' | '良' | '轻度污染' | '中度污染' | '重度污染' | '严重污染';

export interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
    icon: string;
    tempMin: number;
    tempMax: number;
    // Air Quality Fields
    aqi?: number;
    aqiDisplay?: string;
    aqiLevel?: string;
    aqiCategory?: string;
    aqiColor?: {
        red: number;
        green: number;
        blue: number;
        alpha: number;
    };
    primaryPollutant?: {
        code: string;
        name: string;
        fullName?: string;
    };
}

export const AIR_QUALITY_STYLES: Record<AqiCategory, string> = {
    '优': 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    '良': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    '轻度污染': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300',
    '中度污染': 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
    '重度污染': 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    '严重污染': 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
};
