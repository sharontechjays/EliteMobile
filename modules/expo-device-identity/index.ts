// Reexport the native module. On web, it will be resolved to DeviceIdentityModule.web.ts
// and on native platforms to DeviceIdentityModule.ts
export { default } from './src/DeviceIdentityModule';
export * from './src/DeviceIdentity.types';
