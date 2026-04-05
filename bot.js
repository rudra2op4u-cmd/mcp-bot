const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const nodemailer = require('nodemailer');

// --- CONFIGURATION ---
const botArgs = {
  host: 'cromium.play.hosting', // Change this to your server IP
  username: 'Bot',
  version: '1.21.1',
  auth: 'offline',
  hideErrors: true,           // Fix for PartialReadError
  checkTimeoutInterval: 90000 // Fix for 1.21.11 join lag
};

// --- EMAIL CONFIG (Use Gmail App Password) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'YOUR_EMAIL@gmail.com',
    pass: 'abcd efgh ijkl mnop' // YOUR 16-CHARACTER APP PASSWORD
  }
});

let bot;
let joinFailCount = 0;

function createBot() {
  console.log(`[SYSTEM] Attempting to join... (Strike: ${joinFailCount})`);
  bot = mineflayer.createBot(botArgs);

  // Load Plugins
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);

  bot.on('spawn', () => {
    console.log("[GAME] Bot joined successfully!");
    joinFailCount = 0; // Reset counter on success

    // Anti-AFK: Look and Jump every 3 minutes
    setInterval(() => {
      if (bot && bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
        bot.look(Math.random() * 6, 0);
      }
    }, 180000);
  });

  // Combat Commands
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

  // --- TWO-STRIKE EMAIL LOGIC ---
  bot.on('end', (reason) => {
    joinFailCount++;
    console.log(`[OFFLINE] Reason: ${reason}`);

    if (joinFailCount >= 2) {
      console.log("[ALERT] Second failure. Sending email...");
      sendEmailAlert(reason);
      
      // Wait 10 minutes after an alert before trying again to avoid spam
      setTimeout(createBot, 600000); 
    } else {
      // First fail, try again in 30 seconds
      setTimeout(createBot, 30000);
    }
  });

  bot.on('error', (err) => {
    if (!err.message.includes('PartialReadError')) {
        console.log(`[ERROR] ${err.message}`);
    }
  });
}

async function sendEmailAlert(reason) {
  const mailOptions = {
    from: 'YOUR_EMAIL@gmail.com',
    to: 'YOUR_EMAIL@gmail.com',
    subject: '🚨 Minecraft Bot Alert: Server Offline',
    text: `Your bot "Rudra_Fighter" failed to connect twice.\n\nReason: ${reason}\n\nPlease check Play.hosting manually.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("[EMAIL] Alert sent to your inbox!");
  } catch (err) {
    console.log("[EMAIL ERROR] Could not send mail: " + err.message);
  }
}

// Start the process
createBot();
