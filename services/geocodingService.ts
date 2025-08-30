// To resolve issues with missing Google Maps type definitions, declare the global 'google' variable.
declare var google: any;

// Keep track of script loading status to avoid loading it multiple times.
let scriptLoadingPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Google Maps JavaScript API script if it's not already loaded.
 * Caches the loading promise to prevent redundant script injection.
 * @param apiKey Your Google Maps API key.
 * @returns A promise that resolves when the script is loaded.
 */
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
    return Promise.resolve();
  }
  
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const scriptId = 'google-maps-script';

    // If script tag exists, it might be loading or failed. We trust the promise logic.
    // If promise is null, we create a new one.
    if (document.getElementById(scriptId)) {
        // In a complex scenario, you might want to handle script load failures more gracefully.
        // For this app, we'll assume a new attempt can be made if the promise was reset.
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      scriptLoadingPromise = null; // Reset on error to allow retries.
      document.getElementById(scriptId)?.remove(); // Clean up failed script tag.
      reject(new Error('Google Maps script could not be loaded.'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
};

/**
 * Geocodes an address string to latitude and longitude using the client-side Google Maps API.
 * @param apiKey Your Google Maps API key.
 * @param address The address to geocode.
 * @returns A promise that resolves with the coordinates { latitude, longitude }.
 */
export const geocodeAddress = async (apiKey: string, address: string): Promise<{ latitude: number; longitude: number }> => {
  await loadGoogleMapsScript(apiKey);
  
  if (!google || !google.maps || !google.maps.Geocoder) {
    throw new Error("Google Maps Geocoder is not available. The script might have failed to load.");
  }
  
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({
          latitude: location.lat(),
          longitude: location.lng(),
        });
      } else {
        let userFacingError;
        switch(status) {
          case 'ZERO_RESULTS':
            userFacingError = '指定された住所が見つかりませんでした。入力内容を確認してください。';
            break;
          case 'REQUEST_DENIED':
            userFacingError = 'ジオコーディングのリクエストが拒否されました。APIキーやリファラ制限を確認してください。';
            break;
          case 'OVER_QUERY_LIMIT':
            userFacingError = 'APIの利用上限に達しました。しばらくしてからもう一度お試しください。';
            break;
          case 'INVALID_REQUEST':
            userFacingError = '無効なリクエストです。入力された住所に問題がある可能性があります。';
            break;
          default:
            userFacingError = `座標を取得できませんでした。(${status})`;
        }
        reject(new Error(userFacingError));
      }
    });
  });
};
