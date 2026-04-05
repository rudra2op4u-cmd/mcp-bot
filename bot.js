const http = require('http');
const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');

// --- 1. KEEP-ALIVE SERVER (For Render/Cron-job) ---
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.write("Rudra's Combat Bot is Online!");
  res.end();
}).listen(PORT);

// --- 2. BOT CONFIGURATION ---
const botArgs = {
  host: 'cromium.play.hosting', // Update if your IP changes
  username: 'BOT',
  version: '1.21.1',           // Works for 1.21.11 as well
  auth: 'offline',
  checkTimeoutInterval: 90000
};

let bot;
let fightInterval = null;
let targetName = null;

function createBot() {
  bot = mineflayer.createBot(botArgs);

  // Load Plugins
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);

  bot.on('login', () => console.log(`[SUCCESS] Logged in as ${bot.username}`));

  // --- 3. CHAT COMMANDS ---
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    // STATIONARY / STOP COMMAND
    if (message === '?stop') {
      stopCombat();
      bot.chat("Combat terminated. Standing still for target practice.");
      return;
    }

    // FIGHT COMMAND
    if (message === '?fight') {
      targetName = username;
      const player = bot.players[username];

      if (!player || !player.entity) {
        bot.chat("I can't see you! Get closer so I can lock on.");
        return;
      }

      bot.chat(`Combat Protocol Engaged: Targeting ${username}`);
      executeAttack(player.entity);

      // HEARTBEAT MONITOR: Restarts AI if it stalls mid-fight
      if (fightInterval) clearInterval(fightInterval);
      fightInterval = setInterval(() => {
        const p = bot.players[targetName];
        if (targetName && p && p.entity) {
          if (!bot.pvp.target) {
            console.log("[DEBUG] AI Stalled. Re-engaging target...");
            bot.pvp.attack(p.entity);
          }
        }
      }, 2000); 
    }
  });

  // --- 4. COMBAT FUNCTIONS ---
  function executeAttack(entity) {
    // 1. Equip best armor
    bot.armorManager.equipAll();
    
    // 2. Equip best weapon
    const weapon = bot.inventory.items().find(i => i.name.includes('sword') || i.name.includes('axe'));
    if (weapon) bot.equip(weapon, 'hand');

    // 3. Movement configuration
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);

    // 4. Start PVP
    bot.pvp.attack(entity);
  }

  function stopCombat() {
    targetName = null;
    if (fightInterval) clearInterval(fightInterval);
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
    bot.clearControlStates();
  }

  // --- 5. EVENT HANDLERS (Respawn & Cleanup) ---
  bot.on('entityDead', (entity) => {
    if (bot.pvp.target === entity || entity === bot.entity) {
      console.log("[LOG] Target or Bot died. Stopping AI.");
      stopCombat();
    }
  });

  bot.on('death', () => {
    console.log("[WARN] Bot died! Respawning in 5 seconds...");
    stopCombat();
    setTimeout(() => bot.respawn(), 5000);
  });

  bot.on('end', (reason) => {
    console.log(`[DISCONNECT] ${reason}. Reconnecting in 15s...`);
    stopCombat();
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => console.log(`[ERROR] ${err.message}`));
}

// Start the bot
createBot();
