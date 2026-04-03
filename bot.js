const http = require('http');
const mineflayer = require('mineflayer');

// 1. KEEP-ALIVE SERVER (For Render)
// This creates a small website so Render doesn't put the bot to sleep.
http.createServer((req, res) => {
  res.write("Minecraft Player is Online!");
  res.end();
}).listen(8080);

// 2. BOT CONFIGURATION
const botArgs = {
  host: 'cromium.play.hosting',
  username: 'RudraBot_AFK', // You can change this name
  version: '1.21.1',        // Matches your server version
  hideErrors: true          // Keeps the logs clean
};

let bot;

// 3. MAIN BOT FUNCTION
function createBot() {
  bot = mineflayer.createBot(botArgs);

  // When the bot successfully logs in
  bot.on('login', () => {
    console.log(`[LOG] Bot logged into ${botArgs.host} as ${botArgs.username}`);
  });

  // Anti-AFK Logic: Makes the bot jump every 60 seconds
  bot.on('spawn', () => {
    console.log("[LOG] Bot spawned in the world.");
    
    // Clear any existing intervals to prevent double-jumping
    if (global.afkInterval) clearInterval(global.afkInterval);

    global.afkInterval = setInterval(() => {
      if (bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
        console.log("[LOG] Anti-AFK: Jumped.");
      }
    }, 60000); // 60,000ms = 1 minute
  });

  // Chat handling (Optional: keeps track of what's happening)
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[CHAT] ${username}: ${message}`);
  });

  // 4. AUTO-RECONNECT LOGIC
  // If the server restarts or the bot is kicked, it waits 10 seconds and tries again.
  bot.on('end', (reason) => {
    console.log(`[WARN] Disconnected: ${reason}. Reconnecting in 10 seconds...`);
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.log(`[ERROR] ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.log("[ERROR] Connection refused. Is the server down?");
    }
  });

  bot.on('kicked', (reason) => {
    console.log(`[KICKED] Reason: ${reason}`);
  });
}

// Start the bot for the first time
createBot();
