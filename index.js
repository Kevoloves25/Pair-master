const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E';

// BOTS WITH REAL PAIRING SITES
const BOTS_DATA = [
  {
    name: "🚀 CYPHER-X",
    pairing_url: "https://pairx6-09722f5196cd.herokuapp.com/",
    github_url: "https://github.com/Dark-Xploit/CypherX",
    form_field: "number",
    type: "json" // This one returns JSON
  },
  {
    name: "💫 JUNE-MD",
    pairing_url: "https://session-2s-dfa3baea9dc1.herokuapp.com/pair", 
    github_url: "https://github.com/Vinpink2/june-md",
    form_field: "number",
    type: "html" // This one returns HTML
  }
];

// DEPLOYMENT LINKS
const DEPLOY_LINKS = {
  katabump: "https://dashboard.katabump.com/auth/login#61ab63",
  bothosting: "https://bot-hosting.net/?aff=1349004593627009138"
};

console.log('🔐 Token loaded:', BOT_TOKEN.substring(0, 15) + '...');

const bot = new Telegraf(BOT_TOKEN);
const userSessions = new Map();

// ==================== SMART PAIRING FUNCTION ====================

async function getPairingCode(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  
  console.log(`🤖 Pairing: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 URL: ${botData.pairing_url}`);

  try {
    const formData = {
      [botData.form_field]: phoneNumber
    };

    console.log('📤 Sending:', formData);

    const response = await axios.post(botData.pairing_url, formData, {
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Pairing-Bot/1.0)',
        'Accept': 'application/json, text/html, */*'
      },
      validateStatus: () => true
    });

    console.log('📊 Status:', response.status);
    console.log('📦 Data type:', typeof response.data);

    // Handle HTML responses (like JUNE-MD)
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE') || response.data.includes('<html')) {
      console.log('🔍 Processing HTML response...');
      return processHTMLResponse(botData, phoneNumber, response.data);
    }
    
    // Handle JSON responses (like CYPHER-X)
    return processJSONResponse(botData, phoneNumber, response.data);

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    return {
      success: false,
      message: `❌ *Connection Failed*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Error:* ${error.message}\n\n` +
               `💡 Please try the pairing site manually.`
    };
  }
}

function processJSONResponse(botData, phoneNumber, data) {
  console.log('🔍 Processing JSON response...');
  
  // Extract code from JSON response
  let pairingCode = null;
  
  // Try different JSON field names
  if (data && data.code) pairingCode = data.code;
  else if (data && data.pairing_code) pairingCode = data.pairing_code;
  else if (data && data.sessionId) pairingCode = data.sessionId;
  else if (data && data.sessionID) pairingCode = data.sessionID;
  else if (data && data.session_id) pairingCode = data.session_id;
  else if (data && data.id) pairingCode = data.id;
  
  // Look for session patterns in the entire JSON string
  if (!pairingCode && data) {
    const jsonStr = JSON.stringify(data);
    const sessionMatch = jsonStr.match(/([A-Z0-9]{3,6}-[A-Z0-9]{3,6})/);
    if (sessionMatch) pairingCode = sessionMatch[1];
  }

  if (pairingCode) {
    return {
      success: true,
      message: `✅ *Session ID Generated!*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Phone:* \`${phoneNumber}\`\n` +
               `*Session ID:* \`${pairingCode}\`\n\n` +
               `💡 *Use the command /deploy to get started.*`,
      code: pairingCode
    };
  } else {
    return {
      success: true,
      message: `✅ *Pairing Successful!*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Phone:* \`${phoneNumber}\`\n\n` +
               `📱 *Check your WhatsApp for pairing code.*\n` +
               `💡 *Use /deploy command to continue.*`
    };
  }
}

function processHTMLResponse(botData, phoneNumber, html) {
  console.log('🔍 Processing HTML response...');
  
  // Extract information from HTML
  let pairingCode = null;
  let statusMessage = 'Pairing request submitted';
  
  // Look for session IDs in HTML
  const sessionMatch = html.match(/([A-Z0-9]{3,6}-[A-Z0-9]{3,6})/);
  if (sessionMatch) {
    pairingCode = sessionMatch[1];
  }
  
  // Look for success messages
  if (html.includes('success') || html.includes('Success') || html.includes('paired')) {
    statusMessage = 'Pairing successful';
  }
  
  if (html.includes('error') || html.includes('Error') || html.includes('failed')) {
    statusMessage = 'Pairing may have failed';
  }

  if (pairingCode) {
    return {
      success: true,
      message: `✅ *${statusMessage}!* \n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Phone:* \`${phoneNumber}\`\n` +
               `*Session ID:* \`${pairingCode}\`\n\n` +
               `💡 *Use the command /deploy to get started.*`,
      code: pairingCode
    };
  } else {
    return {
      success: true,
      message: `✅ *${statusMessage}!*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Phone:* \`${phoneNumber}\`\n\n` +
               `📱 *Check your WhatsApp for pairing code.*\n` +
               `💡 *Use /deploy command to continue.*`
    };
  }
}

// ==================== ANIMATED BOT HANDLERS ====================

function getMainMenu() {
  const buttons = BOTS_DATA.map((bot, index) => [
    Markup.button.callback(`🔑 ${bot.name}`, `pair_${index}`),
    Markup.button.url(`📂 Repo`, bot.github_url)
  ]);
  
  // Add refresh button at bottom
  buttons.push([Markup.button.callback('🔄 Refresh', 'refresh_menu')]);
  
  return Markup.inlineKeyboard(buttons);
}

function getDeployMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.url('🚀 Katabump', DEPLOY_LINKS.katabump)],
    [Markup.button.url('🤖 Bot Hosting', DEPLOY_LINKS.bothosting)],
    [Markup.button.callback('« Back to Menu', 'back_to_menu')]
  ]);
}

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
    `*Format:* Country code + number (no + sign)\n\n` +
    `Use /start to see the main menu again!`
  );
});

bot.command('deploy', async (ctx) => {
  await ctx.replyWithMarkdown(
    `🚀 *Deployment Platforms*\n\n` +
    `Choose where to deploy your bot:`,
    getDeployMenu()
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

// Handle phone number input
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);
  const messageText = ctx.message.text.trim();
  
  // Ignore commands
  if (messageText.startsWith('/')) return;
  
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
    
    const botData = BOTS_DATA[session.pairingBot];
    const loadingMsg = await ctx.reply('⏳ Contacting pairing service...');
    
    // Get pairing code
    const result = await getPairingCode(session.pairingBot, messageText);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    // Send result with animated menu
    await ctx.replyWithMarkdown(
      result.message,
      Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu'),
        Markup.button.callback('🔄 Pair Another', 'refresh_menu')
      ])
    );
    
    userSessions.delete(userId);
  }
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
});

// ==================== START BOT ====================

async function startBot() {
  try {
    console.log('🚀 Starting Bot Pairing Hub...');
    console.log('📋 Available bots:', BOTS_DATA.map(b => b.name).join(', '));
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connected: @' + botInfo.username);
    
    await bot.launch();
    console.log('🎉 Bot is now running! Send /start to test.');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Shutting down bot gracefully...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM...');
  bot.stop('SIGTERM');
});

// Start the bot
startBot();
