import { registerRootComponent } from 'expo';
import App from './App';

// Registers the root component directly rather than relying on Expo's
// default `main: node_modules/expo/AppEntry.js` entry point, which breaks
// under npm workspaces (expo is hoisted to the repo root, not
// apps/mobile/node_modules, so that relative path doesn't resolve).
registerRootComponent(App);
