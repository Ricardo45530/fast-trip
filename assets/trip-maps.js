'use strict';

const tripMaps = (() => {
  // Set a website-restricted Maps JavaScript API key when Google Maps is activated.
  const browserKey = '';
  let mapsPromise;

  function coordinates(lat, lng) {
    if ([lat, lng].some(value => value == null || value === '')) return null;
    const point = {lat: Number(lat), lng: Number(lng)};
    return Number.isFinite(point.lat) && Number.isFinite(point.lng)
      && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 ? point : null;
  }

  function navigation(provider, lat, lng, address) {
    const point = coordinates(lat, lng);
    const target = point ? point.lat + ',' + point.lng : address?.trim();
    if (!target) return null;
    if (provider === 'waze') {
      return 'https://waze.com/ul?' + new URLSearchParams({
        [point ? 'll' : 'q']: target, navigate: 'yes', utm_source: 'fasttrip'
      });
    }
    return 'https://www.google.com/maps/dir/?' + new URLSearchParams({
      api: '1', destination: target, travelmode: 'driving', dir_action: 'navigate'
    });
  }

  function location(lat, lng, provider) {
    const point = coordinates(lat, lng);
    if (!point) return null;
    if (provider === 'waze') return 'https://waze.com/ul?' + new URLSearchParams({
      ll: point.lat + ',' + point.lng, utm_source: 'fasttrip'
    });
    return 'https://www.google.com/maps/search/?' + new URLSearchParams({
      api: '1', query: point.lat + ',' + point.lng
    });
  }

  function loadGoogleMaps() {
    if (!browserKey) return Promise.resolve(null);
    if (mapsPromise) return mapsPromise;
    mapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const callback = 'fastTripGoogleMapsReady';
      const timeout = setTimeout(() => finish(new Error('Tiempo de espera del mapa agotado')), 12000);
      function finish(error) {
        clearTimeout(timeout);
        if (error) script.remove();
        delete window[callback];
        if (error) reject(error);
        else if(window.google?.maps)resolve(window.google.maps);
        else reject(new Error('Google Maps no está disponible'));
      }
      window[callback] = () => finish();
      script.onerror = () => finish(new Error('No se pudo cargar Google Maps'));
      script.src = 'https://maps.googleapis.com/maps/api/js?' + new URLSearchParams({
        key: browserKey, callback, loading: 'async', language: 'es', region: 'EC', v: 'quarterly'
      });
      script.async = true;
      document.head.append(script);
    }).catch(error => {
      mapsPromise = null;
      throw error;
    });
    return mapsPromise;
  }

  return {coordinates, navigation, location, loadGoogleMaps, googleMapConfigured: Boolean(browserKey)};
})();
