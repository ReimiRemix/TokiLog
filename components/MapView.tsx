// FIX: To resolve issues with missing Google Maps type definitions in the build environment,
// the `google` global is declared as `any`. This bypasses compile-time errors
// and relies on the Google Maps script being loaded at runtime.
declare var google: any;

import React, { useEffect, useMemo, useState, useRef } from 'react';
import type { Restaurant } from '../types';
import { APIProvider, Map, useMap, InfoWindow, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

interface MapViewProps {
  restaurants: Restaurant[];
  apiKey: string;
}

const mapContainerStyle = { 
    height: 'calc(100vh - 340px)', 
    width: '100%' 
};

// This component handles the clustering logic and InfoWindow display.
// The previous implementation had an infinite re-render loop on marker click.
// This version fixes that by:
// 1. Storing marker DOM elements in a `useRef` object instead of React state to avoid re-renders.
// 2. Using the (undocumented but functional) `anchor` prop on `InfoWindow` to correctly
//    attach it to a marker, which is more stable than positioning it manually.
const Markers: React.FC<{ restaurants: Restaurant[] }> = ({ restaurants }) => {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Store marker elements in a ref, mapping restaurant ID to the marker instance.
  // This avoids re-rendering when markers are added.
  const markerElements = useRef<{ [key: string]: any }>({}).current;

  // Find the marker instance for the selected restaurant
  const selectedMarker = useMemo(() => {
    if (!selectedRestaurant) return null;
    return markerElements[selectedRestaurant.id];
  }, [selectedRestaurant, markerElements]);

  // Callback ref to populate the markerElements ref object
  const setMarkerRef = (marker: any | null, key: string) => {
    if (marker) {
      markerElements[key] = marker;
    } else {
      delete markerElements[key];
    }
  };
  
  // Effect to initialize and update the marker clusterer
  useEffect(() => {
    if (!map) return;
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({ map });
    }

    // After the restaurants list changes and markers are rendered, update the clusterer.
    clusterer.current.clearMarkers();
    clusterer.current.addMarkers(Object.values(markerElements));
    
  }, [map, restaurants, markerElements]);

  return (
    <>
      {restaurants.map(restaurant => (
        <AdvancedMarker
          position={{ lat: restaurant.latitude, lng: restaurant.longitude }}
          key={restaurant.id}
          ref={marker => setMarkerRef(marker, restaurant.id)}
          onClick={() => setSelectedRestaurant(restaurant)}
          title={restaurant.name}
        />
      ))}

      {selectedRestaurant && selectedMarker && (
        <InfoWindow
          anchor={selectedMarker}
          onCloseClick={() => setSelectedRestaurant(null)}
        >
          <div className="p-1 font-sans">
            <h3 className="font-bold text-base text-slate-800">{selectedRestaurant.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{selectedRestaurant.address}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};


// This component dynamically adjusts the map's viewport
const MapController: React.FC<{restaurants: Restaurant[]}> = ({restaurants}) => {
    const map = useMap();

    useEffect(() => {
        if (!map || restaurants.length === 0) return;

        // Add a small delay to allow clusterer to calculate before fitting bounds
        const timer = setTimeout(() => {
          if (restaurants.length === 1) {
              map.setCenter({ lat: restaurants[0].latitude, lng: restaurants[0].longitude });
              map.setZoom(15);
          } else {
              const bounds = new google.maps.LatLngBounds();
              restaurants.forEach(r => bounds.extend({ lat: r.latitude, lng: r.longitude }));
              map.fitBounds(bounds);
          }
        }, 100);

        return () => clearTimeout(timer);
    }, [map, restaurants]);

    return null;
};


const MapView: React.FC<MapViewProps> = ({ restaurants, apiKey }) => {
  const validRestaurants = useMemo(() => restaurants.filter(
    r => r.latitude != null && r.longitude != null && (r.latitude !== 0 || r.longitude !== 0)
  ), [restaurants]);

  if (restaurants.length > 0 && validRestaurants.length === 0) {
      return (
        <div className="text-center flex items-center justify-center py-16 px-6 bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border" style={mapContainerStyle}>
          <div>
            <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text">地図に表示できるお店がありません</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">フィルターに一致するお店に、有効な位置情報が登録されていないようです。</p>
          </div>
        </div>
      );
  }
  
  if (restaurants.length === 0) {
     return (
        <div className="text-center flex items-center justify-center py-16 px-6 bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border" style={mapContainerStyle}>
          <div>
            <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text">まだお気に入りがありません</h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">まずはお店をお気に入りに追加しましょう！</p>
          </div>
        </div>
      );
  }

  return (
    <div className="rounded-ui-medium overflow-hidden shadow-soft border border-light-border dark:border-dark-border">
        <div style={mapContainerStyle}>
            <APIProvider apiKey={apiKey} libraries={['marker']}>
                <Map
                    defaultCenter={{ lat: 35.6895, lng: 139.6917 }}
                    defaultZoom={5}
                    mapId={'location-record-map'}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    className="w-full h-full"
                >
                    <Markers restaurants={validRestaurants} />
                    <MapController restaurants={validRestaurants} />
                </Map>
            </APIProvider>
        </div>
    </div>
    );
};

export default MapView;