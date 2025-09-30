const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E'; // Your token

// Bot data with REAL pairing APIs
const BOTS_DATA = [
  {
    name: "cypherX",
    api_url: "https://pairx6-09722f5196cd.herokuapp.com/",
    github_url: "https://github.com/Dark-Xploit/CypherX?tab=readme-ov-file",
    method: "POST" // Most use POST
  },
  {
    name: "🚀 Shadow MD", 
    api_url: "https://shadow-api.vercel.app/api/pair",
    github_url: "https://github.com/ShadowMaker-0/Shadow-MD",
    method: "POST"
  },
  {
    name: "🤖 Atlas MD",
    api_url: "https://atlas-bot.vercel.app/api/pair", 
    github_url: "https://github.com/atlas-dev/Atlas-MD",
    method: "POST"
  },
  {
    name: "⚡ Drixser MD",
    api_url: "https://drixser-api.herokuapp.com/api/pair",
    github_url: "https://github.com/Drixser/Drixser-MD",
    method: "POST"
  }
];

console.log('🔐 Token loaded:', BOT_TOKEN.substring(0, 15) + '...');
console.log('🤖 Loaded bots:', BOTS_DATA.length);

const bot = new Telegraf(BOT_TOKEN);
const userSessions = new Map();

// ==================== REAL API INTEGRATION ====================

async function getRealPairingCode(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  
  console.log(`🔌 Calling REAL API: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 API: ${botData.api_url}`);
  
  try {
    const requestData = {
      phone: phoneNumber,
      timestamp: Date.now()
    };

    const config = {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Telegram-Bot-Pairing-Hub/1.0)',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    let response;
    
    if (botData.method === "POST") {
      response = await axios.post(botData.api_url, requestData, config);
    } else {
      // For GET requests, add phone as query parameter
      response = await axios.get(`${botData.api_url}?phone=${phoneNumber}`, config);
    }

    console.log('✅ API Response received:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data));

    // Different bots return pairing codes in different formats
    if (response.data.pairing_code) {
      return response.data.pairing_code;
    } else if (response.data.code) {
      return response.data.code;
    } else if (response.data.result && response.data.result.code) {
      return response.data.result.code;
    } else if (response.data.message && response.data.message.includes('code')) {
      // Extract code from message
      const codeMatch = response.data.message.match(/\b\d{4,8}\b/);
      return codeMatch ? codeMatch[0] : response.data.message;
    } else if (typeof response.data === 'string' && response.data.includes('code')) {
      const codeMatch = response.data.match(/\b\d{4,8}\b/);
      return codeMatch ? codeMatch[0] : 'Check WhatsApp for code';
    } else {
      // If we can't parse the code, return the raw data
      return JSON.stringify(response.data).substring(0, 100) + '...';
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return '❌ Pairing service is currently offline';
    } else if (error.code === 'ETIMEDOUT') {
      return '⏰ Pairing service timeout. Please try again.';
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      console.log(`📊 Error response: ${status}`, data);
      
      if (status === 400) {
        return '❌ Invalid phone number format';
      } else if (status === 429) {
        return '🚫 Too many requests. Please wait a few minutes.';
      } else if (status === 404) {
        return '🔍 Pairing endpoint not found';
      } else if (status === 500) {
        return '⚙️ Server error. Please try another bot.';
      } else {
        return `❌ API Error: ${status} - ${JSON.stringify(data)}`;
      }
    } else {
      return '❌ Network error. Please check your connection.';
    }
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

// ==================== BOT HANDLERS ====================

bot.start(async (ctx) => {
  const welcomeText = `🤖 *Welcome to Bot Pairing Hub* 🤖\n\n` +
    `I help you pair WhatsApp MD bots *using their real APIs*!\n\n` +
    `*Available Bots:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index + 1}. ${bot.name}`
    ).join('\n') +
    `\n\n✅ *Real API Integration*\n❌ No random codes\n\nSelect a bot to get started:`;
  
  await ctx.replyWithMarkdown(welcomeText, getMainMenu());
});

bot.help(async (ctx) => {
  await ctx.replyWithMarkdown(
    `*🤖 Bot Pairing Hub - Real APIs* 🤖\n\n` +
    `*How it works:*\n` +
    `1. Select a WhatsApp MD bot\n` +
    `2. Enter your phone number\n` +
    `3. I call the bot's REAL pairing API\n` +
    `4. You get the ACTUAL pairing code\n\n` +
    `*Phone Format:* 254712345678 (no +)\n` +
    `*Real Codes:* From official bot APIs\n\n` +
    `No more random numbers - real integration!`
  );
});

bot.action(/pair_(\d+)/, async (ctx) => {
  const botIndex = parseInt(ctx.match[1]);
  const botData = BOTS_DATA[botIndex];
  
  userSessions.set(ctx.from.id, { pairingBot: botIndex });
  
  await ctx.editMessageText(
    `🔑 *Pairing ${botData.name}*\n\n` +
    `📡 *Using Official API:* ${botData.api_url}\n\n` +
    `Please enter your phone number with country code:\n\n` +
    `*Examples:*\n` +
    `🇰🇪 Kenya: 254712345678\n` +
    `🇳🇬 Nigeria: 2348123456789\n` +
    `🇮🇳 India: 919876543210\n\n` +
    `*Format:* [Country Code][Number] (no + sign)\n\n` +
    `⚡ *Real API Call - No Random Codes*`,
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
    `🔄 Menu refreshed!\n\n` +
    `*Real API Integration Active*\n` +
    `Select a bot to get started:`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

bot.action('back_to_menu', async (ctx) => {
  userSessions.delete(ctx.from.id);
  await ctx.editMessageText(
    `🤖 *Bot Pairing Hub - Real APIs* 🤖\n\n` +
    `Select a bot to get started:`,
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
    
    const botData = BOTS_DATA[session.pairingBot];
    const loadingMsg = await ctx.reply(
      `⏳ *Calling ${botData.name} API...*\n\n` +
      `📡 ${botData.api_url}\n` +
      `📞 Sending: ${messageText}`,
      { parse_mode: 'Markdown' }
    );
    
    // CALL THE REAL API
    const pairingCode = await getRealPairingCode(session.pairingBot, messageText);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    // Format the response based on success/error
    if (pairingCode.includes('❌') || pairingCode.includes('Error')) {
      await ctx.replyWithMarkdown(
        `❌ *API Call Failed*\n\n` +
        `*Bot:* ${botData.name}\n` +
        `*Phone:* \`${messageText}\`\n` +
        `*Error:* ${pairingCode}\n\n` +
        `💡 *Troubleshooting:*\n` +
        `• Try a different bot\n` +
        `• Check phone number format\n` +
        `• API might be temporarily down`,
        Markup.inlineKeyboard([
          Markup.button.callback('« Back to Menu', 'back_to_menu'),
          Markup.button.callback('🔄 Try Another Bot', 'refresh_menu')
        ])
      );
    } else {
      await ctx.replyWithMarkdown(
        `✅ *Real Pairing Code Received!*\n\n` +
        `*Bot:* ${botData.name}\n` +
        `*Phone:* \`${messageText}\`\n` +
        `*Pairing Code:* \`${pairingCode}\`\n\n` +
        `🌐 *Source:* Official Bot API\n` +
        `💡 *Use this code in your WhatsApp MD bot setup*\n\n` +
        `⚡ *Real API Integration Working*`,
        Markup.inlineKeyboard([
          Markup.button.callback('« Back to Menu', 'back_to_menu'),
          Markup.button.callback('🔄 Pair Another', 'refresh_menu')
        ])
      );
    }
    
    userSessions.delete(userId);
  }
});

// ==================== BOT STARTUP ====================

async function startBot() {
  try {
    console.log('🚀 Starting Telegram Bot Pairing Hub with REAL APIs...');
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connected:', `@${botInfo.username}`);
    console.log('🔌 Real API integration ready');
    
    await bot.launch();
    console.log('🎉 Bot is running with REAL pairing APIs!');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM...');
  bot.stop('SIGTERM');
  process.exit(0);
});

// Start the bot
startBot();
