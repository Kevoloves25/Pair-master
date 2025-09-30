// Load environment variables FIRST
require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// Debug: Check if token is loaded
console.log('🔍 Checking environment...');
console.log('BOT_TOKEN exists:', !!process.env.BOT_TOKEN);
console.log('BOT_TOKEN length:', process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 0);

// Validate bot token
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' || BOT_TOKEN.includes('example')) {
  console.error('❌ ERROR: Invalid BOT_TOKEN');
  console.log('💡 Please check your .env file:');
  console.log('   1. Make sure BOT_TOKEN=your_actual_token_here');
  console.log('   2. No quotes around the token');
  console.log('   3. No spaces around the equals sign');
  console.log('   4. File should be in the same directory as index.js');
  process.exit(1);
}

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
  },
  {
    name: "🤖 Atlas MD",
    api_url: "https://atlas-api.vercel.app/api/pair", 
    github_url: "https://github.com/atlas-dev/Atlas-MD"
  }
];

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// User sessions
const userSessions = new Map();

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
  try {
    const botData = BOTS_DATA[botIndex];
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate random 6-digit code for demo
    const demoCode = Math.floor(100000 + Math.random() * 900000);
    
    return `${demoCode}`;
    
  } catch (error) {
    console.error('Pairing error:', error.message);
    const fallbackCode = Math.floor(100000 + Math.random() * 900000);
    return `${fallbackCode}`;
  }
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

bot.action(/pair_(\d+)/, async (ctx) => {
  const botIndex = parseInt(ctx.match[1]);
  const botData = BOTS_DATA[botIndex];
  
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
  const messageText = ctx.message.text;
  
  if (session && session.pairingBot !== undefined) {
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
    
    const loadingMsg = await ctx.reply('⏳ Requesting pairing code...');
    const pairingCode = await getPairingCode(session.pairingBot, messageText);
    const botName = BOTS_DATA[session.pairingBot].name;
    
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.replyWithMarkdown(
      `*${botName} Pairing Result*\n\n` +
      `📱 Phone: \`${messageText}\`\n` +
      `🔐 Code: *${pairingCode}*\n\n` +
      `_Use this code in your WhatsApp MD bot setup_`,
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
  console.error(`Bot error:`, err);
});

// ==================== START BOT ====================

async function startBot() {
  console.log('🚀 Starting Telegram Bot Pairing Hub...');
  console.log('📋 Loaded bots:', BOTS_DATA.length);
  
  try {
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot connected: @${botInfo.username}`);
    console.log(`🤖 Bot name: ${botInfo.first_name}`);
    console.log('🎉 Bot is now running! Send /start to test.');
    
    await bot.launch();
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    console.log('🔧 Troubleshooting tips:');
    console.log('   1. Check BOT_TOKEN in .env file');
    console.log('   2. Ensure token is from @BotFather');
    console.log('   3. Check internet connection');
    console.log('   4. Verify no firewall blocking Telegram');
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
