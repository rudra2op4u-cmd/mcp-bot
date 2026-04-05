const mineflayer = require('mineflayer');
const puppeteer = require('puppeteer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements } = require('mineflayer-pathfinder');

// --- CONFIGURATION: ADD YOUR LOGINS HERE ---
const ACCOUNTS = {
  "ff775f10": { email: "rudra2op4u@gmail.com", pass: "rudra2op4u@11" },
  "678bd05e": { email: "rdstar2op4u@gmail.com", pass: "rudra2op4u@11" }
};

const botArgs = {
  host: 'cromium.play.hosting', 
  username: 'BOT',
  version: '1.21.1',
  auth: 'offline'
  hideErrors: true,
  checkTimeoutInterval: 90000
};

let bot;

// --- DASHBOARD AUTO-STARTER ---
async function startServerViaPanel(serverId) {
  const creds = ACCOUNTS[serverId];
  if (!creds) return console.log(`[ERROR] No credentials found for ${serverId}`);

  console.log(`[DASHBOARD] Logging in for server: ${serverId}...`);
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();

  try {
    // 1. Go to Login
    await page.goto('https://panel.play.hosting/auth/login');
    await page.type('input[name="username"]', creds.email);
    await page.type('input[name="password"]', creds.pass);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // 2. Go to the specific Server Panel
    await page.goto(`https://panel.play.hosting/server/${serverId}`);
    
    // 3. Find and Click "Start"
    await page.waitForSelector('button');
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent.toLowerCase().includes('start'));
      if (startBtn) {
        startBtn.click();
        return true;
      }
      return false;
    });

    if (clicked) console.log(`[SUCCESS] Start button pressed for ${serverId}`);
    else console.log(`[WARN] Could not find Start button on page for ${serverId}`);

  } catch (err) {
    console.log(`[DASHBOARD ERROR] ${err.message}`);
  } finally {
    await browser.close();
  }
}

// --- BOT INITIALIZATION ---
function createBot() {
  bot = mineflayer.createBot(botArgs);
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);

  bot.on('spawn', () => {
    console.log("[GAME] Bot joined successfully!");
    // Anti-AFK: Look around and jump every 3 mins
    setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
      bot.look(Math.random() * 6, 0);
    }, 180000);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    if (message === '?fight') {
      const player = bot.players[username];
      if (player && player.entity) {
        bot.chat("Target locked. Fight mode active.");
        bot.pvp.attack(player.entity);
      }
    }

    if (message === '?stop') {
      bot.pvp.stop();
      bot.pathfinder.setGoal(null);
      bot.chat("Standing down. Stationary mode active.");
    }
  });

  // --- AUTO-WAKE TRIGGER ---
  bot.on('end', (reason) => {
    console.log(`[OFFLINE] Reason: ${reason}. Attempting Auto-Wake...`);
    
    // Try to start both servers
    Object.keys(ACCOUNTS).forEach(async (id) => {
      await startServerViaPanel(id);
    });

    // Wait 2.5 minutes for server boot before trying to join again
    setTimeout(createBot, 150000);
  });

  bot.on('error', (err) => console.log(`[ERROR] ${err.message}`));
}

createBot();
