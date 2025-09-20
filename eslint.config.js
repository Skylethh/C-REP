// Proxy to the primary flat config in ESM format.
// Keeping this tiny wrapper avoids Node's typeless package warning when tools look for eslint.config.js.
import cfg from './eslint.config.mjs';
export default cfg;
