"use client";

// Weather function UI component
import React from 'react';
import type { WeatherData } from './server';

// Component to render weather data
export function renderWeatherData(weatherData: WeatherData): React.ReactNode {
  return (
    <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
      <p><strong>Location:</strong> {weatherData.location}</p>
      <p><strong>Temperature:</strong> {weatherData.temperature}</p>
      <p><strong>Condition:</strong> {weatherData.condition}</p>
      <p><strong>Humidity:</strong> {weatherData.humidity}</p>
      <p><strong>Wind:</strong> {weatherData.windSpeed}</p>
    </div>
  );
}
