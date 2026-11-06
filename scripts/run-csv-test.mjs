/**
 * Roda o teste de round-trip do CSV fora do Vite (stub do logo via plugin esbuild).
 *  node scripts/run-csv-test.mjs
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));

const svgStubPlugin = {
  name: 'svg-firebase-stub',
  setup(build) {
    build.onResolve({ filter: /\.svg(\?|$)/ }, () => ({
      path: 'svg-stub.js',
      namespace: 'stubs',
    }));
    build.onResolve({ filter: /^(firebase\/[\w-]+|.*lib\/firebase.*)$/ }, () => ({
      path: 'firebase-stub.js',
      namespace: 'stubs',
    }));
    build.onLoad({ filter: /.*/, namespace: 'stubs' }, (args) => {
      if (args.path === 'svg-stub.js') {
        return { contents: 'export default "data:image/svg+xml,<stub>";', loader: 'js' };
      }
      // stub do firebase/firestore + lib/firebase (não usados no teste em Node)
      return {
        contents:
          'export const dbRede = {};\n' +
          'export function handleFirestoreError() {}\n' +
          'export const OperationType = { CREATE:"create", UPDATE:"update", DELETE:"delete", LIST:"list", GET:"get", WRITE:"write" };\n' +
          'export const doc = () => ({});\n' +
          'export const getDoc = async () => ({ exists: () => false, data: () => undefined });\n' +
          'export const setDoc = async () => {};\n' +
          'export const deleteDoc = async () => {};\n' +
          'export const collection = () => ({});\n' +
          'export const getDocs = async () => ({}) ;\n',
        loader: 'js',
      };
    });
  },
};

const outfile = path.join(dir, '.csv-test.mjs');
await build({
  entryPoints: [path.join(dir, 'csv-roundtrip-test.mjs')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  plugins: [svgStubPlugin],
  logLevel: 'warning',
});

const r = spawnSync('node', [outfile], { stdio: 'inherit', cwd: dir });
process.exit(r.status ?? 1);
