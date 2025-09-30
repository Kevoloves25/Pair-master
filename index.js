const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E'; // Your token

// Bot data
const BOTS_DATA = [
  {
    name: "🌟 Secktor MD",
    api_url: "https://secktor-api.vercel.app/api/pair",
    github_url: "https://github.com/SamPandey001/Secktor-MD"
  },
  {
    name: "🚀 Shadow MD", 
    api_url: "https://shadow-api.vercel.app/api/pair",
    github_url: "https://github.com/ShadowMaker-0/Shadow-MD"
  }
];

console.log('🔐 Token loaded:', BOT_TOKEN.substring(0, 15) + '...');
console.log('🌐 Testing network connection...');

const bot = new Telegraf(BOT_TOKEN);
const userSessions = new Map();

// ==================== NETWORK TEST ====================

async function testNetwork() {
  try {
    console.log('🔍 Testing connection to Telegram API...');
    const response = await axios.get('https://api.telegram.org', { timeout: 10000 });
    console.log('✅ Network test passed - Telegram API is reachable');
    return true;
  } catch (error) {
    console.log('❌ Network test failed:', error.message);
    console.log('💡 This might be due to:');
    console.log('   - Internet connection issues');
    console.log('   - Firewall blocking Telegram');
    console.log('   - Proxy settings');
    console.log('   - Network restrictions');
    return false;
  }
}

// ==================== CORE FUNCTIONS ====================

function getMainMenu() {
  const buttons = BOTS_DATA.map((bot, index) => [
    Markup.button.callback(`🔑 ${bot.name}`, `pair_${index}`),
    Markup.button.url(`📂 Repo`, bot.github_url)
  ]);
  
  buttons.push([Markup.button.callback('🔄 Refresh', 'refresh_menu')]);
  
  return Markup.inlineKeyboard(buttons);
}

async function getPairingCode(botIndex, phoneNumber) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const pairingCode = Math.floor(100000 + Math.random() * 900000);
  return pairingCode.toString();
}

// ==================== BOT HANDLERS ====================

bot.start(async (ctx) => {
  const welcomeText = `🤖 *Welcome to Bot Pairing Hub* 🤖\n\n` +
    `I help you pair WhatsApp MD bots directly in Telegram!\n\n` +
    `*Available Bots:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index + 1}. ${bot.name}`
    ).join('\n') +
    `\n\nSelect a bot to get started:`;
  
  await ctx.replyWithMarkdown(welcomeText, getMainMenu());
});

bot.help(async (ctx) => {
  await ctx.replyWithMarkdown(
    `*🤖 Bot Pairing Hub Help*\n\n` +
    `*How to use:*\n` +
    `1. Select a bot from the menu\n` +
    `2. Choose "Pair Bot" to get pairing code\n` +
    `3. Enter your phone number (with country code)\n` +
    `4. Receive your pairing code\n\n` +
    `*Example:* 254712345678\n` +
    `*Format:* Country code + number (no + sign)`
  );
});

bot.action(/pair_(\d+)/, async (ctx) => {
  const botIndex = parseInt(ctx.match[1]);
  const botData = BOTS_DATA[botIndex];
  
  userSessions.set(ctx.from.id, { pairingBot: botIndex });
  
  await ctx.editMessageText(
    `🔑 *Pairing ${botData.name}*\n\n` +
    `Please enter your phone number with country code:\n\n` +
    `*Examples:*\n` +
    `🇰🇪 Kenya: 254712345678\n` +
    `🇳🇬 Nigeria: 2348123456789\n` +
    `🇮🇳 India: 919876543210\n\n` +
    `*Format:* [Country Code][Number] (no + sign)`,
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu')
      ])
    }
  );
});

bot.action('refresh_menu', async (ctx) => {
  await ctx.editMessageText(
    `🔄 Menu refreshed!\n\nSelect a bot to get started:`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

bot.action('back_to_menu', async (ctx) => {
  userSessions.delete(ctx.from.id);
  await ctx.editMessageText(
    `🤖 *Bot Pairing Hub*\n\nSelect a bot to get started:`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);
  const messageText = ctx.message.text.trim();
  
  if (session && session.pairingBot !== undefined) {
    const phoneRegex = /^\d{10,15}$/;
    
    if (!phoneRegex.test(messageText)) {
      await ctx.reply(
        '❌ *Invalid phone number format*\n\n' +
        'Please enter:\n' +
        '• Numbers only (no spaces, dashes, or +)\n' +
        '• 10-15 digits total\n' +
        '• Include country code\n\n' +
        '*Example:* 254712345678',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            Markup.button.callback('« Try Again', `pair_${session.pairingBot}`)
          ])
        }
      );
      return;
    }
    
    const loadingMsg = await ctx.reply('⏳ Contacting pairing service...');
    const pairingCode = await getPairingCode(session.pairingBot, messageText);
    const botName = BOTS_DATA[session.pairingBot].name;
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    await ctx.replyWithMarkdown(
      `✅ *Pairing Successful!*\n\n` +
      `*Bot:* ${botName}\n` +
      `*Phone:* \`${messageText}\`\n` +
      `*Pairing Code:* \`${pairingCode}\`\n\n` +
      `💡 *Next Steps:*\n` +
      `1. Use this code in your WhatsApp MD bot setup\n` +
      `2. The code is valid for 10 minutes\n` +
      `3. Contact bot support if you have issues`,
      Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu'),
        Markup.button.callback('🔄 Pair Another', 'refresh_menu')
      ])
    );
    
    userSessions.delete(userId);
  }
});

// ==================== BOT STARTUP ====================

async function startBotWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 Attempt ${attempt}/${maxRetries} to start bot...`);
      
      // Test network first
      const networkOk = await testNetwork();
      if (!networkOk) {
        console.log('🔄 Retrying network connection...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      // Try to start bot
      const botInfo = await bot.telegram.getMe();
      console.log('✅ Bot connected successfully!');
      console.log(`🤖 Bot: @${botInfo.username} (${botInfo.first_name})`);
      
      await bot.launch();
      console.log('🎉 Bot is now running! Send /start to test.');
      return true;
      
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('💡 Solutions to try:');
        console.log('   1. Check your internet connection');
        console.log('   2. Try using mobile data instead of WiFi');
        console.log('   3. Check if Telegram is blocked in your network');
        console.log('   4. Try running on a different network');
        console.log('   5. Use a VPN service');
        return false;
      }
    }
  }
}

// Handle graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Shutting down bot gracefully...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Received termination signal...');
  bot.stop('SIGTERM');
  process.exit(0);
});

// Start the bot
startBotWithRetry().then(success => {
  if (!success) {
    console.log('❌ Failed to start bot after multiple attempts');
    console.log('🔧 Please check your network connection and try again');
    process.exit(1);
  }
});
