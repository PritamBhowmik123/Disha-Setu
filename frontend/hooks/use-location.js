import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_STORAGE_KEY = 'user_last_location';
export const LOCATION_PREF_KEY = 'location_permission_enabled';

// Neutral central Bangalore default — only used on very first launch
const DEFAULT_LOCATION = { label: 'Bangalore', lat: 12.9716, lng: 77.5946 };

export const PRESET_LOCATIONS = [
  { label: 'Hebbal', lat: 13.0358, lng: 77.5970 },
  { label: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { label: 'MG Road', lat: 12.9756, lng: 77.6095 },
  { label: 'Whitefield', lat: 12.9698, lng: 77.7499 },
  { label: 'Yelahanka', lat: 13.1007, lng: 77.5963 },
  { label: 'Rajajinagar', lat: 12.9915, lng: 77.5530 },
  { label: 'Marathahalli', lat: 12.9591, lng: 77.6974 },
  { label: 'Electronic City', lat: 12.8454, lng: 77.6610 },
  { label: 'Jayanagar', lat: 12.9252, lng: 77.5938 },
];

/**
 * useLocation hook
 *
 * Returns:
 *   coords   { lat, lng } — active location coordinates
 *   label    string      — human-readable location name
 *   mode     'gps' | 'manual'
 *   accuracy number | null — GPS accuracy in metres (GPS mode only)
 *   loading  boolean
 *   error    string | null
 *   startGPS ()           — request permission and begin GPS tracking
 *   setManual({ lat, lng, label }) — switch to manual mode
 */
export function useLocation() {
  const [mode, setMode] = useState('manual');
  const [coords, setCoords] = useState({ lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng });
  const [label, setLabel] = useState(DEFAULT_LOCATION.label);
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);

  // Restore persisted location on mount
  useEffect(() => {
    AsyncStorage.getItem(LOCATION_STORAGE_KEY)
      .then(saved => {
        if (saved) {
          try {
            const { lat, lng, label: lbl, mode: savedMode } = JSON.parse(saved);
            setCoords({ lat, lng });
            setLabel(lbl);
            // GPS positions are restored as manual since live GPS can't be resumed from storage
            setMode(savedMode === 'gps' ? 'manual' : savedMode);
          } catch (_) { /* corrupt data — keep default */ }
        }
      })
      .catch(() => { /* ignore storage errors */ })
      .finally(() => setLoading(false));

    checkLocationPreference();
  }, []);

  const checkLocationPreference = useCallback(async () => {
    try {
      const pref = await AsyncStorage.getItem(LOCATION_PREF_KEY);
      const enabled = pref === null ? true : pref === 'true';
      setIsLocationEnabled(enabled);
      return enabled;
    } catch (e) {
      return true; // default true
    }
  }, []);

  // Clean up GPS watcher on unmount or mode change
  useEffect(() => {
    return () => {
      if (subscription) subscription.remove();
    };
  }, [subscription]);

  const startGPS = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Remove any previous watcher
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }

    const enabled = await checkLocationPreference();
    if (!enabled) {
      setError('Location access is disabled in Settings.');
      setLoading(false);
      return false;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable it in Settings.');
        setLoading(false);
        return false;
      }

      let initial = await Location.getLastKnownPositionAsync({});
      if (!initial) {
        initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
      }
      const lat = initial.coords.latitude;
      const lng = initial.coords.longitude;

      let locLabel = 'Current Location';
      try {
        let detectedCity = 'Current Location';
        let regionName = '';

        if (Platform.OS === 'web') {
          // Fallback to OSM API for web because Expo's reverse geocoding is unsupported
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            detectedCity = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Current Location';
            regionName = addr.state || '';
          }
        } else {
          const address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (address && address.length > 0) {
            const place = address[0];
            detectedCity = place.city || place.subregion || place.district || place.region || 'Current Location';
            regionName = place.region || '';
          }
        }

        // Map Belur/Howrah or anything in West Bengal to Kolkata for demo purposes
        const dLower = detectedCity.toLowerCase();
        if (dLower === 'belur' || dLower === 'bluer' || dLower === 'howrah' || regionName === 'West Bengal') {
          detectedCity = 'Kolkata';
        }
        locLabel = detectedCity;
      } catch (err) {
        console.warn('Reverse geocode failed:', err);
      }

      setCoords({ lat, lng });
      setAccuracy(initial.coords.accuracy);
      setLabel(locLabel);
      setMode('gps');
      setLoading(false);

      // Persist the GPS-obtained coordinates
      AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({ lat, lng, label: locLabel, mode: 'gps' })
      ).catch(() => { });

      // Watch for subsequent updates, avoid on web due to LocationEventEmitter bug
      if (Platform.OS !== 'web') {
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
          (loc) => {
            setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            setAccuracy(loc.coords.accuracy);
          }
        );
        setSubscription(sub);
      }
      return true;
    } catch (e) {
      setError('Could not get your location. Please try again.');
      setLoading(false);
      return false;
    }
  }, [subscription]);

  const setManual = useCallback(({ lat, lng, label: lbl }) => {
    // Stop any GPS watcher
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setCoords({ lat, lng });
    setLabel(lbl);
    setMode('manual');
    setError(null);

    // Persist the chosen location so it's restored after login
    AsyncStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ lat, lng, label: lbl, mode: 'manual' })
    ).catch(() => { });
  }, [subscription]);

  return { coords, label, mode, accuracy, loading, error, isLocationEnabled, checkLocationPreference, startGPS, setManual };
}
