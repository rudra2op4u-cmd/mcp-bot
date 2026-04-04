const http = require('http');
const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');

// 1. KEEP-ALIVE SERVER (For Render/Cron-job)
http.createServer((req, res) => {
  res.write("Combat Bot is Online!");
  res.end();
}).listen(8080);

// 2. BOT CONFIG
const bot = mineflayer.createBot({
  host: 'cromium.play.hosting', // Update to your server IP
  username: 'BOT',
  version: '1.21.1', // Change to 1.21.11 if needed
  auth: 'offline'
});

// 3. LOAD PLUGINS
bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);

// 4. MAIN LOGIC
bot.on('chat', (username, message) => {
  if (username === bot.username) return;

  // --- THE KILL SWITCH / STATIONARY MODE ---
  if (message === '?stop') {
    bot.pvp.stop();                // Stop swinging sword
    bot.pathfinder.setGoal(null);  // Stop all walking/pathfinding
    bot.clearControlStates();      // Stop jumping/sprinting/walking
    
    bot.chat("Standing down. Stationary mode active.");
    console.log(`[STATIONARY] Manual stop by ${username}`);
    return;
  }

  // --- FIGHT MODE ---
  if (message === '?fight') {
    const player = bot.players[username];
    if (!player || !player.entity) {
      bot.chat("I can't see you! Come closer.");
      return;
    }

    bot.chat(`Engaging ${username}. Armouring up!`);

    // Auto-Equip Armor & Weapon
    bot.armorManager.equipAll();
    const weapon = bot.inventory.items().find(item => 
      item.name.includes('sword') || item.name.includes('axe')
    );
    if (weapon) bot.equip(weapon, 'hand');

    // Movement Logic (allows bot to jump and navigate)
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);

    // Start Attack AI
    bot.pvp.attack(player.entity);
  }
});

// 5. AUTO-STOP ON DEATH
bot.on('entityDead', (entity) => {
  if (bot.pvp.target === entity || entity === bot.entity) {
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
    bot.clearControlStates();
  }
});

// 6. AUTO-RESPAWN & RECONNECT
bot.on('death', () => {
  console.log("[WARN] Bot died! Respawning in 5s...");
  setTimeout(() => bot.respawn(), 5000);
});

bot.on('end', (reason) => {
  console.log(`[WARN] Disconnected: ${reason}. Retrying in 15s...`);
  setTimeout(() => {
    // Logic to restart the bot process
    process.exit(); 
  }, 15000);
});

bot.on('error', (err) => console.log(`[ERROR] ${err.message}`));
