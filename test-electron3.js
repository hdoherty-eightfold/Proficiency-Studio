console.log('process.type:', process.type);
if (process.type === 'browser') {
  const { app } = require('electron');
  console.log('app available:', !!app);
} else {
  console.log('Not running as Electron main process!');
  console.log('This script must be the main entry point in package.json');
}
