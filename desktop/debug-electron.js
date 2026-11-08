const { downloadArtifact } = require('@electron/get');
const { version } = require('./node_modules/electron/package.json');
console.log('electron version:', version, '| skip env:', process.env.ELECTRON_SKIP_BINARY_DOWNLOAD);
downloadArtifact({
  version,
  artifactName: 'electron',
  platform: 'win32',
  arch: 'x64',
  checksums: require('./node_modules/electron/checksums.json'),
})
  .then((p) => console.log('ZIP OK:', p))
  .catch((e) => { console.error('DOWNLOAD ERR:', e && e.stack ? e.stack : e); process.exit(1); });
