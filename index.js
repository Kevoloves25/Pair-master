const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E';

// BOTS WITH REAL PAIRING SITES - Let's test them properly
const BOTS_DATA = [
  {
    name: "🚀 CYPHER-X",
    pairing_url: "https://pairx6-09722f5196cd.herokuapp.com/",
    github_url: "https://github.com/Dark-Xploit/CypherX"
  },
  {
    name: "💫 JUNE-MD",
    pairing_url: "https://session-2s-dfa3baea9dc1.herokuapp.com/pair", 
    github_url: "https://github.com/Vinpink2/june-md"
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

// ==================== TEST PAIRING SITES ====================

async function testPairingSite(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  
  console.log(`\n🧪 TESTING: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 URL: ${botData.pairing_url}`);

  // Test different data formats and endpoints
  const testCases = [
    // Test 1: Basic number field
    { data: { number: phoneNumber }, description: "number field" },
    // Test 2: Phone field
    { data: { phone: phoneNumber }, description: "phone field" },
    // Test 3: Different endpoint
    { data: { number: phoneNumber }, url: botData.pairing_url.replace('/pair', '') + '/', description: "root endpoint" },
  ];

  for (const testCase of testCases) {
    const testUrl = testCase.url || botData.pairing_url;
    
    console.log(`\n🔧 Testing: ${testCase.description}`);
    console.log(`📤 URL: ${testUrl}`);
    console.log(`📦 Data:`, testCase.data);

    try {
      const response = await axios.post(testUrl, testCase.data, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Pairing-Bot/1.0)'
        },
        validateStatus: () => true
      });

      console.log(`📊 Status: ${response.status}`);
      
      // Check if response contains any useful information
      if (response.data) {
        console.log(`📦 Response type: ${typeof response.data}`);
        
        if (typeof response.data === 'string') {
          console.log(`📝 Response preview: ${response.data.substring(0, 200)}...`);
          
          // Check for success indicators in HTML/text
          if (response.data.includes('success') || response.data.includes('Success') || 
              response.data.includes('paired') || response.data.includes('session')) {
            console.log('✅ Found success indicators in response');
            
            // Try to extract any code-like patterns
            const codeMatch = response.data.match(/([A-Z0-9]{3,6}-[A-Z0-9]{3,6})/);
            if (codeMatch) {
              return {
                success: true,
                message: `✅ *Pairing Successful!*\n\n` +
                         `*Bot:* ${botData.name}\n` +
                         `*Phone:* \`${phoneNumber}\`\n` +
                         `*Session ID:* \`${codeMatch[1]}\`\n\n` +
                         `💡 *Use the command /deploy to get started.*`,
                code: codeMatch[1]
              };
            } else {
              return {
                success: true,
                message: `✅ *Pairing Request Sent!*\n\n` +
                         `*Bot:* ${botData.name}\n` +
                         `*Phone:* \`${phoneNumber}\`\n\n` +
                         `📱 *The pairing site accepted your request.*\n` +
                         `💡 *Check your WhatsApp for the code.*`
              };
            }
          }
        } else if (typeof response.data === 'object') {
          console.log(`📋 JSON Response:`, JSON.stringify(response.data, null, 2));
          
          // Check for code in JSON response
          if (response.data.code || response.data.sessionId || response.data.pairing_code) {
            const code = response.data.code || response.data.sessionId || response.data.pairing_code;
            return {
              success: true,
              message: `✅ *Pairing Successful!*\n\n` +
                       `*Bot:* ${botData.name}\n` +
                       `*Phone:* \`${phoneNumber}\`\n` +
                       `*Session ID:* \`${code}\`\n\n` +
                       `💡 *Use the command /deploy to get started.*`,
              code: code
            };
          }
        }
      }

      // If we get a 200 status but no clear success, assume it worked
      if (response.status === 200) {
        return {
          success: true,
          message: `✅ *Pairing Request Sent!*\n\n` +
                   `*Bot:* ${botData.name}\n` +
                   `*Phone:* \`${phoneNumber}\`\n\n` +
                   `📱 *The pairing site accepted your request.*\n` +
                   `💡 *Check your WhatsApp for the pairing code.*`
        };
      }

    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  // If all tests failed
  return {
    success: false,
    message: `❌ *Unable to connect to pairing service*\n\n` +
             `*Bot:* ${botData.name}\n` +
             `*Phone:* \`${phoneNumber}\`\n\n` +
             `💡 *Please try:*\n` +
             `• Visiting the site manually: ${botData.pairing_url}\n` +
             `• Checking if the site is online\n` +
             `• Contacting the bot developer`
  };
}

// ==================== BOT HANDLERS ====================

function getMainMenu() {
  const buttons = BOTS_DATA.map((bot, index) => [
    Markup.button.callback(`🔑 ${bot.name}`, `pair_${index}`),
    Markup.button.url(`📂 Repo`, bot.github_url)
  ]);
  
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
    `*How it works:*\n` +
    `1. I send your number to the bot's pairing site\n` +
    `2. The pairing site generates a code\n` +
    `3. I show you the code here in Telegram\n\n` +
    `*Phone Format:* 254712345678\n` +
    `*No random codes - real pairing only!*`
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
    const loadingMsg = await ctx.reply('⏳ Testing pairing service...');
    
    // Test the pairing site
    const result = await testPairingSite(session.pairingBot, messageText);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    // Send result
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
