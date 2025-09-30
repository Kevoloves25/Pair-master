const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// Bot configuration
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const BOTS_DATA = [
  {
    name: "🌟 Cool WhatsApp MD",
    api_url: "https://coolbot.site/api/pair",
    github_url: "https://github.com/user/cool-whatsapp-md"
  },
  {
    name: "🚀 FastBot MD", 
    api_url: "https://fastbot.site/api/pair",
    github_url: "https://github.com/user/fastbot-md"
  },
  {
    name: "🤖 MegaBot MD",
    api_url: "https://megabot.site/api/pair", 
    github_url: "https://github.com/user/megabot-md"
  }
];

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// User sessions (in production, use Redis)
const userSessions = new Map();

// ==================== CORE FUNCTIONS ====================

/**
 * Generate main menu with all bots
 */
function getMainMenu() {
  const buttons = BOTS_DATA.map(bot => [
    Markup.button.callback(`🔑 Pair ${bot.name}`, `pair_${BOTS_DATA.indexOf(bot)}`),
    Markup.button.url(`📂 Repo`, bot.github_url)
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Call pairing API for a specific bot
 */
async function getPairingCode(botIndex, phoneNumber) {
  try {
    const botData = BOTS_DATA[botIndex];
    const response = await axios.post(botData.api_url, {
      phone: phoneNumber
    }, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Telegram-Bot-Pairing-Hub/1.0'
      }
    });
    
    return response.data.pairing_code || response.data.code || 'Check your WhatsApp for code';
  } catch (error) {
    console.error('Pairing API error:', error.message);
    
    if (error.response?.status === 400) {
      return '❌ Invalid phone number format';
    } else if (error.response?.status === 429) {
      return '⏳ Too many requests. Please try again in a few minutes';
    } else {
      return '❌ Pairing service temporarily unavailable';
    }
  }
}

// ==================== BOT HANDLERS ====================

// Start command
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

// Handle pairing button clicks
bot.action(/pair_(\d+)/, async (ctx) => {
  const botIndex = parseInt(ctx.match[1]);
  const botData = BOTS_DATA[botIndex];
  
  // Store which bot user wants to pair
  userSessions.set(ctx.from.id, { pairingBot: botIndex });
  
  await ctx.editMessageText(
    `🔑 *Pairing ${botData.name}*\n\n` +
    `Please enter your phone number with country code:\n` +
    `*Example:* 254712345678\n\n` +
    `Format: [Country Code][Number] (no + sign)`,
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu')
      ])
    }
  );
});

// Handle phone number input
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);
  const messageText = ctx.message.text;
  
  if (session && session.pairingBot !== undefined) {
    // Validate phone number (basic validation)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(messageText)) {
      await ctx.reply(
        '❌ Invalid phone number format.\n' +
        'Please enter numbers only (10-15 digits) with country code.\n' +
        'Example: 254712345678',
        Markup.inlineKeyboard([
          Markup.button.callback('« Try Again', `pair_${session.pairingBot}`)
        ])
      );
      return;
    }
    
    // Show loading message
    const loadingMsg = await ctx.reply('⏳ Requesting pairing code...');
    
    // Get pairing code
    const pairingCode = await getPairingCode(session.pairingBot, messageText);
    const botName = BOTS_DATA[session.pairingBot].name;
    
    // Send result
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.replyWithMarkdown(
      `*${botName} Pairing Result*\n\n` +
      `📱 Phone: ${messageText}\n` +
      `🔐 Code: *${pairingCode}*\n\n` +
      `_Use this code in your WhatsApp MD bot setup_`,
      Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu')
      ])
    );
    
    // Clear session
    userSessions.delete(userId);
  }
});

// Back to menu handler
bot.action('back_to_menu', async (ctx) => {
  userSessions.delete(ctx.from.id); // Clear any active session
  await ctx.editMessageText(
    `🤖 *Welcome to Bot Pairing Hub* 🤖\n\nSelect a bot to get started:`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred. Please try again.');
});

// ==================== START BOT ====================

async function startBot() {
  console.log('🚀 Starting Telegram Bot Pairing Hub...');
  
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
  
  try {
    await bot.launch();
    console.log('✅ Bot is running and ready!');
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
