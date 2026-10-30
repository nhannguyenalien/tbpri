import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const alias = {
  'firebase/app': './lib/compat/app.js',
  'firebase/database': './lib/compat/database.js',
  'firebase/auth': './lib/compat/auth.js',
};

export default {
  output: 'standalone',
  turbopack: { root: path.join(here, '..'), resolveAlias: alias },
  webpack(config) {
    for (const [k, v] of Object.entries(alias)) config.resolve.alias[k] = path.join(here, v);
    return config;
  },
};
