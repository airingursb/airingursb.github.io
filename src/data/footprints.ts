// src/data/footprints.ts
// Cities the author has lived in or visited. Rendered by the homepage
// "Footprints" card via the Mapbox-backed FootprintsMap component.
//
// Coordinates are WGS84 (EPSG:4326). Names are kept in the locale the
// author would write them in — the FootprintsMap component uses the
// browser locale (or Mapbox's localized basemap labels) for context.

export interface City {
  name: string;
  lat: number;
  lng: number;
  /** ISO-3166-1 alpha-2, used for stats + popup country tag. */
  country: 'SG' | 'CN' | 'US' | 'NZ' | 'ID' | 'MY';
  /** Continent grouping for stats. */
  continent: 'Asia' | 'Oceania' | 'North America';
  /** Currently lives here — gets the pulsing marker treatment. */
  current?: boolean;
}

export const cities: City[] = [
  // Current
  { name: 'Singapore', lat: 1.35, lng: 103.82, country: 'SG', continent: 'Asia', current: true },
  // Overseas
  { name: 'San Jose', lat: 37.34, lng: -121.89, country: 'US', continent: 'North America' },
  { name: 'Bintan Island', lat: 1.07, lng: 104.45, country: 'ID', continent: 'Asia' },
  { name: 'Batam Island', lat: 1.05, lng: 104.03, country: 'ID', continent: 'Asia' },
  { name: 'Johor Bahru', lat: 1.49, lng: 103.74, country: 'MY', continent: 'Asia' },
  { name: 'Christchurch', lat: -43.53, lng: 172.64, country: 'NZ', continent: 'Oceania' },
  { name: 'Queenstown', lat: -45.03, lng: 168.66, country: 'NZ', continent: 'Oceania' },
  { name: 'Dunedin', lat: -45.87, lng: 170.50, country: 'NZ', continent: 'Oceania' },
  // China
  { name: '大理', lat: 25.60, lng: 100.27, country: 'CN', continent: 'Asia' },
  { name: '昆明', lat: 25.04, lng: 102.68, country: 'CN', continent: 'Asia' },
  { name: '南宁', lat: 22.82, lng: 108.32, country: 'CN', continent: 'Asia' },
  { name: '深圳', lat: 22.54, lng: 114.06, country: 'CN', continent: 'Asia' },
  { name: '广州', lat: 23.13, lng: 113.26, country: 'CN', continent: 'Asia' },
  { name: '佛山', lat: 23.02, lng: 113.12, country: 'CN', continent: 'Asia' },
  { name: '惠州', lat: 23.11, lng: 114.42, country: 'CN', continent: 'Asia' },
  { name: '上海', lat: 31.23, lng: 121.47, country: 'CN', continent: 'Asia' },
  { name: '杭州', lat: 30.27, lng: 120.15, country: 'CN', continent: 'Asia' },
  { name: '苏州', lat: 31.30, lng: 120.62, country: 'CN', continent: 'Asia' },
  { name: '南京', lat: 32.06, lng: 118.80, country: 'CN', continent: 'Asia' },
  { name: '北京', lat: 39.90, lng: 116.40, country: 'CN', continent: 'Asia' },
  { name: '重庆', lat: 29.56, lng: 106.55, country: 'CN', continent: 'Asia' },
  { name: '福州', lat: 26.07, lng: 119.30, country: 'CN', continent: 'Asia' },
  { name: '合肥', lat: 31.82, lng: 117.23, country: 'CN', continent: 'Asia' },
  { name: '六安', lat: 31.74, lng: 116.51, country: 'CN', continent: 'Asia' },
  { name: '西宁', lat: 36.62, lng: 101.77, country: 'CN', continent: 'Asia' },
  { name: '敦煌', lat: 40.14, lng: 94.66, country: 'CN', continent: 'Asia' },
  { name: '珠海', lat: 22.27, lng: 113.58, country: 'CN', continent: 'Asia' },
  { name: '中山', lat: 22.52, lng: 113.39, country: 'CN', continent: 'Asia' },
];

export const COUNTRY_FLAGS: Record<City['country'], string> = {
  SG: '🇸🇬',
  CN: '🇨🇳',
  US: '🇺🇸',
  NZ: '🇳🇿',
  ID: '🇮🇩',
  MY: '🇲🇾',
};
