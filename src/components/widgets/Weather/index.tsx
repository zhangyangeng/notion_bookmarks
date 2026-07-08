'use client';


import { useWeatherData } from './useWeatherData';
import { useCitySelector } from './useCitySelector';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { WeatherDisplay } from './WeatherDisplay';
import { CitySelector } from './CitySelector';
import { setStoredCity } from '@/lib/weather/storage';

interface WeatherProps {
  defaultCity?: string;
}

export default function Weather({ defaultCity = '杭州' }: WeatherProps) {
  const {
    weatherData,
    loading,
    error,
    currentCity,
    isRefreshing,
    refreshWeather,
    updateCity
  } = useWeatherData(defaultCity);

  const {
    show: showSelector,
    close: closeSelector,
    toggle: toggleSelector,
    menuRef,
    buttonRef
  } = useCitySelector();

  const handleSelectCity = (city: string) => {
    updateCity(city);
    setStoredCity(city);
    closeSelector();
  };

  const handleClearSavedCity = () => {
    localStorage.removeItem('weatherCity');
    refreshWeather(); // Will fallback to auto
    closeSelector();
  };

  const handleRefreshLocation = () => {
    refreshWeather();
  };

  if (loading && !isRefreshing) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState 
        message={error} 
        currentCity={currentCity} 
        onRetry={() => refreshWeather()}
        onOpenSelector={toggleSelector}
        buttonRef={buttonRef}
      >
        <CitySelector 
            show={showSelector}
            menuRef={menuRef}
            buttonRef={buttonRef}
            onClose={closeSelector}
            onRefreshLocation={handleRefreshLocation}
            onClearSavedCity={handleClearSavedCity}
            onSelectCity={handleSelectCity}
            isRefreshing={isRefreshing}
            savedCity={currentCity !== 'auto' ? currentCity : null} // Simplification
        />
      </ErrorState>
    );
  }

  if (!weatherData) return null; // Should be covered by loading/error

  return (
    <WeatherDisplay 
      weatherData={weatherData}
      onToggleSelector={toggleSelector}
      buttonRef={buttonRef}
    >
      <CitySelector 
          show={showSelector}
          menuRef={menuRef}
          buttonRef={buttonRef}
          onClose={closeSelector}
          onRefreshLocation={handleRefreshLocation}
          onClearSavedCity={handleClearSavedCity}
          onSelectCity={handleSelectCity}
          isRefreshing={isRefreshing}
          // Only show clear button if we likely have a stored city or manually selected one
          // Ideally useWeatherData exposes if "savedCity" exists. 
          // For now, consistent with logic: if we have weather data and it's not auto-refreshing initially.
          savedCity={localStorage.getItem('weatherCity')} 
      />
    </WeatherDisplay>
  );
}
