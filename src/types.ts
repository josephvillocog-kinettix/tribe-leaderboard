/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Tribe {
  id: number;
  tribe: string;
  points: number;
  color?: string;
}

export interface TribeConfig {
  id: number;
  key: string;
  name: string;
  avatar: string;
  color: string;           // CSS gradients e.g., 'from-blue-500 to-teal-500'
  accentColor: string;     // Solid color e.g., 'text-blue-400'
  bgGradient: string;      // Card bg gradient
  textColor: string;
  borderColor: string;
  shadowColor: string;
  description: string;
  element: string;         // 'Ocean', 'Water', 'Earth', 'Wind', 'Fire', 'Volcano'
  motto: string;           // Hawaiian phrase + translation
  icon: string;            // Name of Lucide icon to use
  logoUrl: string;         // Path to tribal logo image asset
}

export interface IslandEvent {
  id: string;
  title: string;
  description: string;
  tribeKey: string;
  pointsChanged: number;
  timestamp: string;
  type: 'boost' | 'challenge' | 'volcano';
}

export interface LeaderboardResponse {
  tribes: Tribe[];
  timestamp: number;
  isSimulated: boolean;
  activeEvent: IslandEvent | null;
}
