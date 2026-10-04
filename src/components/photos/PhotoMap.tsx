import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import { createSiteMap, MAPBOX_TOKEN, mapStyle } from '../../lib/site-map';
import { useColorTheme } from '../workouts/workoutColors';
import './photo-map.css';

export interface PhotoPin {
  citySlug: string;
  city: string;
  country: string;
  coords: [number, number]; // Photo catalog stores latitude, longitude.
  count: number;
  thumb: string;
}

interface Props { pins: PhotoPin[]; detail?: boolean }

const placeUrl = (pin: PhotoPin) => `/photos/places/${encodeURIComponent(pin.citySlug)}/`;

export default function PhotoMap({ pins, detail = false }: Props) {
  const container = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const theme = useColorTheme();
  const appliedTheme = React.useRef(theme);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'unavailable'>('loading');

  React.useEffect(() => {
    if (!container.current || !pins.length || !MAPBOX_TOKEN || !mapboxgl.supported()) {
      setStatus('unavailable');
      return;
    }
    let map: mapboxgl.Map;
    try {
      map = createSiteMap(container.current, theme, {
        center: [pins[0].coords[1], pins[0].coords[0]],
        zoom: detail ? 11 : 2,
        scrollZoom: !detail,
        projection: 'mercator',
      }, !detail);
    } catch {
      setStatus('unavailable');
      return;
    }
    mapRef.current = map;
    appliedTheme.current = theme;
    map.on('load', () => setStatus('ready'));
    map.on('error', () => setStatus('unavailable'));
    map.on('idle', () => {
      if (map.isStyleLoaded() && map.areTilesLoaded()) setStatus('ready');
    });
    const markers = pins.map(pin => {
      const element = document.createElement(detail ? 'a' : 'button');
      element.className = 'photo-map-marker';
      element.setAttribute('aria-label', `${pin.city}: ${pin.count} photo${pin.count === 1 ? '' : 's'}`);
      if (element instanceof HTMLAnchorElement) element.href = placeUrl(pin);
      if (element instanceof HTMLButtonElement) element.type = 'button';
      const dot = document.createElement('span');
      dot.className = 'photo-map-dot';
      dot.textContent = pin.count > 1 ? String(pin.count) : '';
      element.append(dot);
      const marker = new mapboxgl.Marker({ element })
        .setLngLat([pin.coords[1], pin.coords[0]]).addTo(map);
      if (!detail) {
        const link = document.createElement('a');
        link.className = 'photo-map-place';
        link.href = placeUrl(pin);
        const image = document.createElement('img');
        image.src = pin.thumb;
        image.alt = pin.city;
        image.width = 200;
        image.height = 132;
        const text = document.createElement('span');
        text.textContent = `${pin.city}, ${pin.country} · ${pin.count} photo${pin.count === 1 ? '' : 's'}`;
        link.append(image, text);
        const popup = new mapboxgl.Popup({ className: 'photo-map-popup', offset: 16, maxWidth: '220px' })
          .setDOMContent(link);
        marker.setPopup(popup);
        popup.on('open', () => {
          const analytics = (window as Window & { umami?: { track: (name: string, data: Record<string, string | number>) => void } }).umami;
          analytics?.track('world-marker-click', { city: pin.city, country: pin.country, count: pin.count });
        });
      }
      return marker;
    });
    if (!detail) {
      const bounds = new mapboxgl.LngLatBounds();
      pins.forEach(pin => bounds.extend([pin.coords[1], pin.coords[0]]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 6, animate: false });
    }
    return () => {
      markers.forEach(marker => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [pins, detail]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (map && appliedTheme.current !== theme) {
      appliedTheme.current = theme;
      setStatus('loading');
      map.setStyle(mapStyle(theme));
    }
  }, [theme]);

  return <div className="photo-map" data-map-status={status}>
    <div ref={container} className="photo-map-canvas" aria-label={detail ? 'Photo location map' : 'Photo world map'} />
    {status !== 'ready' && <div className="photo-map-fallback" role="status">
      <span>{status === 'loading' ? 'Loading map…' : 'Map unavailable. Browse photos by place:'}</span>
      <div>{pins.map(pin => <a key={pin.citySlug} href={placeUrl(pin)}>{pin.city}</a>)}</div>
    </div>}
  </div>;
}
