import { spawn } from "child_process";
import fs from "fs";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9223;
const TARGET_URL = "http://localhost:1420/";
const OUT_PATH = "C:\\Users\\chips\\.gemini\\antigravity-ide\\brain\\4cd6d5cb-76cf-4268-962c-d9d402ec3350\\levels_hollows_summit.png";

const edge = spawn(EDGE_PATH, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:\\temp\\edge_cdp",
  "--window-size=2560,1305",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check"
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        if (wsUrl) break;
      } catch (e) {}
    }

    if (!wsUrl) throw new Error("Could not connect to Edge CDP");

    const ws = new WebSocket(wsUrl);
    let id = 1;
    const callbacks = new Map();

    ws.onmessage = msg => {
      const parsed = JSON.parse(msg.data);
      if (callbacks.has(parsed.id)) {
        callbacks.get(parsed.id)(parsed);
        callbacks.delete(parsed.id);
      }
    };

    const send = (method, params = {}) => new Promise(resolve => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    await new Promise(r => ws.onopen = r);

    // Create a new target page
    const targetRes = await send("Target.createTarget", { url: TARGET_URL });
    const targetId = targetRes.result.targetId;

    const sessionRes = await send("Target.attachToTarget", { targetId, flatten: true });
    const sessionId = sessionRes.result.sessionId;

    const sendSession = (method, params = {}) => new Promise(resolve => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });

    await sendSession("Page.enable");
    await sendSession("Runtime.enable");

    // Wait for loading screen to finish
    await sendSession("Runtime.evaluate", {
      awaitPromise: true,
      expression: `
        new Promise((resolve) => {
          const check = () => {
            const loader = document.querySelector('.ws-loading, [class*="loading"]');
            const nav = document.querySelector('nav, .ws-nav, header, [role="navigation"]');
            if (nav && !loader) return resolve(true);
            setTimeout(check, 200);
          };
          check();
        })
      `
    });

    await sleep(1000);

    // Navigate to Levels view
    await sendSession("Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const levelsBtn = buttons.find(b => b.textContent && b.textContent.includes('Levels'));
          if (levelsBtn) levelsBtn.click();
        })()
      `
    });

    // Dismiss any tutorial tooltip
    await sendSession("Runtime.evaluate", {
      expression: `
        (() => {
          const gotIt = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Got it'));
          if (gotIt) gotIt.click();
        })()
      `
    });

    await sleep(500);

    // Scroll to level 82 (Verdant Beyond levels 80-85 view)
    await sendSession("Runtime.evaluate", {
      expression: `
        (() => {
          const scroll = document.querySelector('.ws-trail__scroll');
          const stop82 = Array.from(document.querySelectorAll('.ws-trail__stop')).find(s => s.textContent.trim().startsWith('82'));
          if (scroll && stop82) {
            const left = parseFloat(stop82.style.left) - scroll.clientWidth * 0.45;
            scroll.scrollLeft = Math.max(0, left);
          }
        })()
      `
    });

    await sleep(1000);

    const shot = await sendSession("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("C:\\Users\\chips\\.gemini\\antigravity-ide\\brain\\4cd6d5cb-76cf-4268-962c-d9d402ec3350\\levels_80_85.png", Buffer.from(shot.result.data, "base64"));
    console.log("Screenshot saved to levels_80_85.png");

    ws.close();
  } finally {
    edge.kill();
  }
}

run().catch(err => {
  console.error(err);
  edge.kill();
  process.exit(1);
});
