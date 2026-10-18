// Localised workout labels, passed from the Astro page (siteStrings) into the
// React island so the Chinese page no longer shows English metric names.
import type { WorkoutMetric } from './types';

export interface WorkoutLabels {
  metricLabels: Record<WorkoutMetric, string>;
  units: Record<'distanceKm' | 'paceSlash' | 'elevUp' | 'elevDown' | 'bpm' | 'bpmAvg' | 'bpmMax' | 'kcal' | 'kcalPerHr' | 'stepsPerMin' | 'metresAvg' | 'metresMin', string>;
  detailLabels: Record<string, string>;
}

export const DEFAULT_LABELS: WorkoutLabels = {
  metricLabels: { pace: 'Pace', elevation: 'Elevation', heart: 'Heart', calories: 'Calories', steps: 'Steps', gps: 'GPS' },
  units: { distanceKm: 'km', paceSlash: 'km/h', elevUp: 'm', elevDown: 'm', bpm: 'bpm', bpmAvg: 'avg', bpmMax: 'max', kcal: 'kcal', kcalPerHr: '/hr', stepsPerMin: '/min', metresAvg: 'm avg', metresMin: 'm min' },
  detailLabels: { avgPace: 'Avg Pace', maxPace: 'Max Pace', vertical: 'Vertical (↑)', metres: 'Metres', gainLoss: 'Gain/Loss', ascent: 'Ascent', descent: 'Descent', bpm: 'BPM', avgBpm: 'Avg BPM', maxBpm: 'Max BPM', total: 'Total', burnPerHr: 'Burn/hr', resting: 'Resting', cadence: 'Cadence', stepLength: 'Length', avgAcc: 'Avg Acc', minAcc: 'Min Acc', map: 'Map', steps: 'Steps', loadMap: 'Load interactive map', loadingMap: 'Loading map…', mapHint: 'Static route preview' },
};
