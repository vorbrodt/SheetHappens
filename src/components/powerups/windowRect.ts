import { View } from 'react-native';

// A box in window coordinates, for animating something from one part of the screen to another.
export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Where `view` sits in the window, or null if it isn't mounted.
export function measureInWindow(view: View | null): Promise<WindowRect | null> {
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) => {
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}
