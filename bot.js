const http = require('http');
const mineflayer = require('mineflayer');

// 1. KEEP-ALIVE SERVER (For Render)
http.createServer((req, res) => {
  res.write("Minecraft Player is Online!");
  res.end();
}).listen(8080);

// 2. BOT CONFIGURATION
const botArgs = {
  host: 'corodium.play.hosting',
  username: 'RudraBot_AFK', 
  version: '1.21.1',
  hideErrors: true,
  auth: 'offline'
};

let bot;

// 3. MAIN BOT FUNCTION
function createBot() {
  bot = mineflayer.createBot(botArgs);

  bot.on('login', () => {
    console.log(`[LOG] Bot logged into ${botArgs.host} as ${botArgs.username}`);
  });

  // Anti-AFK Logic
  bot.on('spawn', () => {
    console.log("[LOG] Bot spawned in the world.");
    if (global.afkInterval) clearInterval(global.afkInterval);

    global.afkInterval = setInterval(() => {
      if (bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
        console.log("[LOG] Anti-AFK: Jumped.");
      }
    }, 60000); 
  });

  // Auto-Respawn Logic
  bot.on('death', () => {
    console.log("[WARN] Bot died! Respawning in 5 seconds...");
    setTimeout(() => {
      bot.respawn();
    }, 5000);
  });

  // Auto-Reconnect Logic
  bot.on('end', (reason) => {
    console.log(`[WARN] Disconnected: ${reason}. Reconnecting in 15 seconds...`);
    if (global.afkInterval) clearInterval(global.afkInterval);
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => {
    console.log(`[ERROR] ${err.message}`);
  });
}

createBot();
