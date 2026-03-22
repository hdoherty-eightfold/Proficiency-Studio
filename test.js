const { app, BrowserWindow } = require("electron");
console.log("app:", typeof app);
if (app) {
  app.whenReady().then(() => {
    console.log("Ready!");
    const w = new BrowserWindow({width:400, height:300});
    w.loadURL("data:text/html,<h1>Test</h1>");
    setTimeout(() => app.quit(), 2000);
  });
}
