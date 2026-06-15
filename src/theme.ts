import { AccentColor } from './types';

export const ACCENT_COLORS: Record<AccentColor, { background: string; text: string }> = {
  lime: { background: '#f6f58a', text: '#666511' },
  yellow: { background: '#f8e485', text: '#725d0a' },
  orange: { background: '#f8d18c', text: '#754c0b' },
  pink: { background: '#f5bdc3', text: '#7b3d46' },
  magenta: { background: '#e7aad2', text: '#713958' },
  cyan: { background: '#65ced0', text: '#174f51' },
  aqua: { background: '#7cc8d9', text: '#245564' },
  blue: { background: '#7fa3e7', text: '#294873' },
  steel: { background: '#879fca', text: '#314666' },
  violet: { background: '#aa9be2', text: '#504378' },
};
