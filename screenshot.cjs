const { app, BrowserWindow } = require('electron');
const path = require('path');

app.disableHardwareAcceleration();

async function capture(url, outputPath) {
  const win = new BrowserWindow({ width: 900, height: 700, show: false });
  await win.loadURL(url);
  await new Promise(r => setTimeout(r, 2000));
  const img = await win.webContents.capturePage();
  require('fs').writeFileSync(outputPath, img.toPNG());
  console.log(`Saved: ${outputPath} (${img.getSize().width}x${img.getSize().height})`);
  win.close();
}

app.whenReady().then(async () => {
  try {
    await capture('http://localhost:5173/main-window/index.html', '/home/vivi/quickcapture/screenshot-main.png');
    await capture('http://localhost:5173/capture-window/index.html', '/home/vivi/quickcapture/screenshot-capture.png');
  } catch(e) {
    console.error(e);
  }
  app.quit();
});
