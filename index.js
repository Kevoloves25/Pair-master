const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAHf-r1xxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Your token

// BOTS WITH THEIR ACTUAL PAIRING SITES AND FORM DETAILS
const BOTS_DATA = [
  {
    name: "🚀 CYPHER-X",
    pairing_url: "https://cypherx-pair.onrender.com/pair", // Replace with actual URL
    github_url: "https://github.com/CypherX-Dev/cypherX-MD",
    form_data: { number: "{phone}" } // Field name might be 'number', 'phone', etc.
  },
  {
    name: "🌟 OZEBA-XD", 
    pairing_url: "https://ozebot-pair.site/pair", // Replace with actual URL
    github_url: "https://github.com/oze-bot/oze-md",
    form_data: { phone: "{phone}" }
  },
  {
    name: "💫 JUNE-MD",
    pairing_url: "https://june-md-pair.vercel.app/api/pair", // Replace with actual URL
    github_url: "https://github.com/june-md/june-bot",
    form_data: { userNumber: "{phone}" }
  },
  {
    name: "🤖 VERONICA-AI",
    pairing_url: "https://veronica-pair.site/pair", // Replace with actual URL
    github_url: "https://github.com/veronica-ai/veronica-md", 
    form_data: { phoneNumber: "{phone}" }
  },
  {
    name: "⚡ DAVE-MD",
    pairing_url: "https://dave-md-pair.site/api/pair", // Replace with actual URL  
    github_url: "https://github.com/dave-md/dave-bot",
    form_data: { number: "{phone}" }
  }
];

console.log('🔐 Token loaded:', BOT_TOKEN.substring(0, 15) + '...');

const bot = new Telegraf(BOT_TOKEN);
const userSessions = new Map();

// ==================== FORM SUBMISSION ====================

async function submitPairingForm(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  
  console.log(`🤖 Submitting form for: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 URL: ${botData.pairing_url}`);

  try {
    // Prepare form data
    const formData = {};
    for (const [key, value] of Object.entries(botData.form_data)) {
      formData[key] = value.replace('{phone}', phoneNumber);
    }

    console.log('📤 Form data:', formData);

    const config = {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pairing-Bot/1.0)',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: function (status) {
        return status < 500; // Don't throw on 4xx errors
      }
    };

    console.log('🚀 Sending POST request...');
    
    const response = await axios.post(botData.pairing_url, formData, config);

    console.log('✅ Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data));

    // Extract pairing code from response
    const pairingCode = extractPairingCode(response.data);
    
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
      // Check if it's a success message without specific code
      if (response.status === 200) {
        return {
          success: true, 
          message: `✅ *Pairing Successful!*\n\n` +
                   `*Bot:* ${botData.name}\n` +
                   `*Phone:* \`${phoneNumber}\`\n\n` +
                   `📱 *Check your WhatsApp for pairing code.*\n` +
                   `💡 *Use /deploy command to continue.*`
        };
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Form submission error:', error.message);
    
    let errorMessage = 'Failed to connect to pairing service';
    
    if (error.response) {
      errorMessage = `Server error: ${error.response.status}`;
      if (error.response.data) {
        errorMessage += ` - ${JSON.stringify(error.response.data)}`;
      }
    } else if (error.request) {
      errorMessage = 'No response from pairing service';
    }
    
    return {
      success: false,
      message: `❌ *Pairing Failed*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Error:* ${errorMessage}\n\n` +
               `💡 *Please try:*\n` +
               `• Visiting the site manually: ${botData.pairing_url}\n` +
               `• Checking if the site is online\n` +
               `• Contacting the bot developer`
    };
  }
}

function extractPairingCode(responseData) {
  if (!responseData) return null;
  
  console.log('🔍 Extracting code from:', JSON.stringify(responseData));
  
  // Try different response formats
  if (responseData.pairing_code) return responseData.pairing_code;
  if (responseData.code) return responseData.code;
  if (responseData.sessionId) return responseData.sessionId;
  if (responseData.sessionID) return responseData.sessionID;
  if (responseData.session_id) return responseData.session_id;
  if (responseData.sessId) return responseData.sessId;
  if (responseData.id) return responseData.id;
  
  // Check message field
  if (responseData.message) {
    const sessionMatch = responseData.message.match(/([A-Z0-9]{4,6}-[A-Z0-9]{4,6}!?)/);
    if (sessionMatch) return sessionMatch[1];
    
    const codeMatch = responseData.message.match(/\b\d{4,8}\b/);
    if (codeMatch) return codeMatch[0];
  }
  
  // String response
  if (typeof responseData === 'string') {
    const sessionMatch = responseData.match(/([A-Z0-9]{4,6}-[A-Z0-9]{4,6}!?)/);
    if (sessionMatch) return sessionMatch[1];
  }
  
  return null;
}

// ==================== BOT HANDLERS ====================

function getMainMenu() {
  const buttons = BOTS_DATA.map((bot, index) => [
    Markup.button.callback(`🔑 ${bot.name}`, `pair_${index}`),
    Markup.button.url(`📂 Repo`, bot.github_url)
  ]);
  
  return Markup.inlineKeyboard(buttons);
}

bot.start(async (ctx) => {
  const welcomeText = `🤖 *WhatsApp Bot Pairing Hub* 🤖\n\n` +
    `*Available Pairing Sites:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index}. ${bot.name}`
    ).join('\n') +
    `\n\n*Please select a bot to pair:*`;
  
  await ctx.replyWithMarkdown(welcomeText, getMainMenu());
});

bot.action(/pair_(\d+)/, async (ctx) => {
  const botIndex = parseInt(ctx.match[1]);
  const botData = BOTS_DATA[botIndex];
  
  userSessions.set(ctx.from.id, { pairingBot: botIndex });
  
  await ctx.editMessageText(
    `🔑 *You have chosen ${botData.name}.*\n\n` +
    `Please send your WhatsApp number to pair.\n\n` +
    `*Format:* Country code + number\n` +
    `*Example:* 254712345678`,
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu')
      ])
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
        'Please enter numbers only (10-15 digits):\n\n' +
        '*Examples:*\n' +
        '254712345678 (Kenya)\n' +
        '2348123456789 (Nigeria)\n' +
        '919876543210 (India)',
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
      `⏳ *Submitting to pairing service...*\n\n` +
      `🤖 Bot: ${botData.name}\n` +
      `📱 Number: ${messageText}\n` +
      `🌐 Site: ${botData.pairing_url}`,
      { parse_mode: 'Markdown' }
    );
    
    // SUBMIT THE FORM
    const result = await submitPairingForm(session.pairingBot, messageText);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.replyWithMarkdown(
      result.message,
      Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu'),
        Markup.button.callback('🔄 Pair Another', 'pair_another')
      ])
    );
    
    userSessions.delete(userId);
  }
});

bot.action('back_to_menu', async (ctx) => {
  userSessions.delete(ctx.from.id);
  await ctx.editMessageText(
    `🤖 *WhatsApp Bot Pairing Hub*\n\n` +
    `*Available Pairing Sites:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index}. ${bot.name}`
    ).join('\n') +
    `\n\n*Please select a bot to pair:*`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

bot.action('pair_another', async (ctx) => {
  userSessions.delete(ctx.from.id);
  await ctx.editMessageText(
    `🔄 *Pair Another Bot*\n\n` +
    `*Available Pairing Sites:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index}. ${bot.name}`
    ).join('\n') +
    `\n\n*Please select a bot to pair:*`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

// ==================== BOT STARTUP ====================

async function startBot() {
  try {
    console.log('🚀 Starting WhatsApp Bot Pairing Hub...');
    console.log('📋 Available bots:', BOTS_DATA.map(b => b.name).join(', '));
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connected:', `@${botInfo.username}`);
    
    await bot.launch();
    console.log('🎉 Pairing hub running! Ready to submit forms.');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
