"use client";

// Weather function UI component
import React from 'react';
import type { WeatherData } from './server';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Thermometer, Cloud, Droplets, Wind } from "lucide-react";

// Component to render weather data
export function renderWeatherData(weatherData: WeatherData): React.ReactNode {
  return (
    <Card className="mt-1 bg-blue-500 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-400">Weather Information</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 text-sm">
        <p className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
          <strong>Location:</strong> {weatherData.location}
        </p>
        <p className="flex items-center gap-2 mb-1">
          <Thermometer size={16} className="text-blue-600 dark:text-blue-400" />
          <strong>Temperature:</strong> {weatherData.temperature}
        </p>
        <p className="flex items-center gap-2 mb-1">
          <Cloud size={16} className="text-blue-600 dark:text-blue-400" />
          <strong>Condition:</strong> {weatherData.condition}
        </p>
        <p className="flex items-center gap-2 mb-1">
          <Droplets size={16} className="text-blue-600 dark:text-blue-400" />
          <strong>Humidity:</strong> {weatherData.humidity}
        </p>
        <p className="flex items-center gap-2 mb-1">
          <Wind size={16} className="text-blue-600 dark:text-blue-400" />
          <strong>Wind:</strong> {weatherData.windSpeed}
        </p>
      </CardContent>
    </Card>
  );
}
