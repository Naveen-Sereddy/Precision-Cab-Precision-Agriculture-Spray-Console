const SCREENS = new Set(['home', 'field', 'active', 'sync', 'rate', 'alert', 'summary', 'scout', 'empty', 'denied', 'settings']);
const DEVICES = new Set(['console', 'tablet', 'phone']);

export function captureStateFromSearch(search) {
  const params = new URLSearchParams(search);
  const screen = params.get('captureScreen');
  const device = params.get('captureDevice');
  const theme = params.get('captureTheme');

  return {
    screen: SCREENS.has(screen) ? screen : 'home',
    device: DEVICES.has(device) ? device : 'console',
    nightMode: theme === 'night',
  };
}
