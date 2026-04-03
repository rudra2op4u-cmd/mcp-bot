const http = require('http');
const mineflayer = require('mineflayer');

// This part creates a mini-webserver to keep Render happy
http.createServer((req, res) => {
  res.write("I am awake!");
  res.end();
}).listen(8080);

const botArgs = {
  host: 'cromium.play.hosting',
  username: 'StayAwakeBot', // Change this to your preferred name
  version: false // It will auto-detect the version
};

let bot;

function createBot() {
  bot = mineflayer.createBot(botArgs);

  bot.on('login', () => console.log("Bot logged in!"));
  
  // Anti-AFK: Jumps every 60 seconds
  bot.on('spawn', () => {
    setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 60000);
  });

  bot.on('end', () => {
    console.log("Disconnected. Reconnecting...");
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => console.log(err));
}

createBot();
