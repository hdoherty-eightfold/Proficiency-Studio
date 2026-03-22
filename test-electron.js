const electron = require('electron');
console.log('electron:', typeof electron);
console.log('app:', typeof electron.app);
if (electron.app) {
  electron.app.whenReady().then(() => {
    console.log('App is ready!');
    electron.app.quit();
  });
} else {
  console.log('electron.app is undefined');
  console.log('electron (first 100 chars):', String(electron).substring(0, 100));
}
