'use strict';

const liveTripMap = (() => {
  const staleAfterMs = 120000;

  function create(container) {
    let map;
    let markers = {};
    let lastStops = '';

    function clear() {
      if (map) map.remove();
      map = null;
      markers = {};
      lastStops = '';
      container.hidden = true;
    }

    function update({vehicle, pickup, destination, status, fresh}) {
      const points = [
        ['pickup', pickup, 'Punto de recogida', 'pickup'],
        ['destination', destination, 'Destino del viaje', 'destination'],
        ['vehicle', vehicle, fresh ? 'Vehículo' : 'Última ubicación del vehículo', fresh ? 'vehicle' : 'stale']
      ].filter(([, point]) => point);
      if (!points.length) {
        clear();
        return;
      }
      if (!window.L) return;
      container.hidden = false;
      if (!container.clientWidth) return;
      if (!map) {
        map = L.map(container, {scrollWheelZoom: false});
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'
        }).addTo(map);
      }

      for (const key of Object.keys(markers)) {
        if (!points.some(([name]) => name === key)) {
          markers[key].remove();
          delete markers[key];
        }
      }
      for (const [key, point, label, style] of points) {
        const position = [point.lat, point.lng];
        if (!markers[key]) {
          markers[key] = L.marker(position, {
            icon: L.divIcon({className: 'ft-map-marker ft-map-' + style, iconSize: [21, 21]}),
            title: label, alt: label, zIndexOffset: key === 'vehicle' ? 1000 : 0
          }).bindTooltip(label).addTo(map);
        } else {
          const marker = markers[key];
          marker.setLatLng(position).setTooltipContent(label);
          const element = marker.getElement();
          if (element) {
            element.classList.toggle('ft-map-vehicle', style === 'vehicle');
            element.classList.toggle('ft-map-stale', style === 'stale');
            element.title = label;
            element.setAttribute('aria-label', label);
          }
        }
      }
      map.invalidateSize({pan: false});
      const stopSignature = JSON.stringify([status, pickup, destination, Boolean(vehicle)]);
      if (lastStops !== stopSignature) {
        const bounds = points.map(([, point]) => [point.lat, point.lng]);
        map.fitBounds(bounds, {padding: [35, 35], maxZoom: 16, animate: false});
        lastStops = stopSignature;
      } else if (vehicle && !map.getBounds().contains([vehicle.lat, vehicle.lng])) {
        map.panTo([vehicle.lat, vehicle.lng], {animate: false});
      }
    }

    return {update, clear};
  }

  function isFresh(timestamp) {
    const time = Date.parse(timestamp);
    return Number.isFinite(time) && Date.now() - time <= staleAfterMs;
  }

  return {create, isFresh};
})();
