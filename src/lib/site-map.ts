import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export const MAPBOX_TOKEN: string | undefined = import.meta.env.PUBLIC_MAPBOX_TOKEN;
export const mapStyle = (theme: 'light' | 'dark') => `mapbox://styles/mapbox/${theme}-v11`;

/** Shared base for homepage footprints and photo maps. Call map.remove() on unmount. */
export function createSiteMap(
  container: HTMLElement,
  theme: 'light' | 'dark',
  options: Omit<mapboxgl.MapOptions, 'container' | 'accessToken' | 'style'> = {},
  navigation = true,
): mapboxgl.Map {
  const map = new mapboxgl.Map({
    container,
    accessToken: MAPBOX_TOKEN,
    style: mapStyle(theme),
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    renderWorldCopies: false,
    ...options,
  });
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
  map.touchZoomRotate.disableRotation();
  if (navigation) {
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-left');
  }
  map.on('style.load', () => localizeLabels(map));
  const observer = new ResizeObserver(() => map.resize());
  observer.observe(container);
  map.on('remove', () => observer.disconnect());
  return map;
}

function localizeLabels(map: mapboxgl.Map) {
  if (document.documentElement.lang !== 'en') return;
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_en'], ['get', 'name']]);
    }
  }
}
