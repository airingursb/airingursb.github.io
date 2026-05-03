// src/components/workouts/icons.tsx
import * as React from 'react';
import type { WorkoutType } from './types';

interface IconProps {
  type: WorkoutType;
  size?: number;
}

export function WorkoutTypeIcon({ type, size = 24 }: IconProps) {
  const path = ICONS[type] ?? ICONS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-label={type}>
      {path}
    </svg>
  );
}

const ICONS: Record<WorkoutType, React.ReactNode> = {
  hiking: (
    <>
      <circle cx="13" cy="4" r="1.6" />
      <path d="M13 7 l-3 6 l3 1 l-2 5" />
      <path d="M5 21 l5 -8 l4 -3" />
      <path d="M16 21 l-2 -7" />
      <path d="M3 21 l4 -3 l2 -4" />
    </>
  ),
  walking: (
    <>
      <circle cx="12" cy="4" r="1.6" />
      <path d="M11 7 l-3 5 l3 2 l-1 7" />
      <path d="M14 21 l-2 -7" />
    </>
  ),
  running: (
    <>
      <circle cx="14" cy="4" r="1.6" />
      <path d="M5 13 l5 -3 l3 3 l-3 5 l3 4" />
      <path d="M16 11 l3 1" />
    </>
  ),
  cycling: (
    <>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17 l3 -7 l5 0 l4 7" />
      <circle cx="14" cy="4" r="1.4" />
    </>
  ),
  other: (
    <circle cx="12" cy="12" r="6" />
  ),
};
