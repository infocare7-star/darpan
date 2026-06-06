/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConnectionStatus = "DISCONNECTED" | "RESOLVING" | "CONNECTING" | "CONNECTED" | "ERROR";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "tx" | "rx";
  message: string;
}

export type WSMessage =
  | { type: "host_registered"; code: string; message: string }
  | { type: "viewer_registered"; success: boolean; code: string; message?: string; reason?: string }
  | { type: "viewer_connected"; message: string }
  | { type: "viewer_disconnected"; message: string }
  | { type: "host_disconnected"; message: string }
  | { type: "screen_frame"; image: string; timestamp: number }
  | { type: "action"; action: "TAP" | "SWIPE"; x?: number; y?: number; startX?: number; startY?: number; endX?: number; endY?: number; timestamp: number };

export interface DeviceState {
  currentTab: "home" | "apps" | "chat" | "settings";
  time: string;
  battery: number;
  unlocked: boolean;
  notes: string[];
  weatherTemp: number;
  scrollPosition: number;
  weatherCity: string;
  drawings: Array<{ x: number; y: number; color: string; size: number }>;
}
