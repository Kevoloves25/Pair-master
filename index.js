const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E'; // Your token

// BOTS WITH REAL WORKING PAIRING SITES
const BOTS_DATA = [
  {
    name: "🚀 CYPHER-X",
    pairing_site: "https://cypherx-pair.onrender.com",
    github_url: "https://github.com/CypherX-Dev/cypherX-MD",
    api_endpoint: "/pair",
    method: "POST",
    request_format: { number: "{phone}" },
    response_type: "session_id" // This bot gives session IDs
  },
  {
    name: "🌟 OZEBA-XD", 
    pairing_site: "https://oze-bot.onrender.com",
    github_url: "https://github.com/oze-bot/oze-md",
    api_endpoint: "/pair",
    method: "POST",
    request_format: { phone: "{phone}" },
    response_type: "session_id"
  },
  {
    name: "💫 JUNE-MD",
    pairing_site: "https://june-pair.vercel.app",
    github_url: "https://github.com/june-md/june-bot",
    api_endpoint: "/api/pair",
    method: "POST", 
    request_format: { userNumber: "{phone}" },
    response_type: "session_id"
  },
  {
    name: "🤖 VERONICA-AI",
    pairing_site: "https://veronica-ai-pair.herokuapp.com",
    github_url: "https://github.com/veronica-ai/veronica-md",
    api_endpoint: "/pair",
    method: "POST",
    request_format: { phoneNumber: "{phone}" },
    response_type: "session_id"
  },
  {
    name: "⚡ DAVE-MD",
    pairing_site: "https://dave-md-pair.site",
    github_url: "https://github.com/dave-md/dave-bot", 
    api_endpoint: "/api/pair",
    method: "POST",
    request_format: { number: "{phone}" },
    response_type: "session_id"
  }
];

console.log('🔐 Token loaded:', BOT_TOKEN.substring(0, 15) + '...');

const bot = new Telegraf(BOT_TOKEN);
const userSessions = new Map();

// ==================== REAL SESSION ID PAIRING ====================

async function getRealSessionID(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  
  console.log(`🔌 Getting REAL Session ID for: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 API: ${botData.pairing_site}${botData.api_endpoint}`);

  try {
    const fullUrl = botData.pairing_site + botData.api_endpoint;
    
    // Prepare request data - different bots use different field names
    const requestData = JSON.parse(
      JSON.stringify(botData.request_format)
        .replace(/{phone}/g, phoneNumber)
    );

    console.log('📤 Sending request:', requestData);

    const config = {
      timeout: 20000, // Longer timeout for pairing
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pairing-Bot/1.0)',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    let response;
    
    if (botData.method === "POST") {
      response = await axios.post(fullUrl, requestData, config);
    } else {
      response = await axios.get(fullUrl, { params: requestData, ...config });
    }

    console.log('✅ API Response Status:', response.status);
    console.log('📦 Full Response:', JSON.stringify(response.data, null, 2));

    // EXTRACT SESSION ID FROM DIFFERENT RESPONSE FORMATS
    const sessionInfo = extractSessionInfo(response.data);
    
    if (sessionInfo.success) {
      return {
        success: true,
        message: `✅ *Session ID Generated!*\n\n` +
                 `*Bot:* ${botData.name}\n` +
                 `*Phone:* \`${phoneNumber}\`\n` +
                 `*Session ID:* \`${sessionInfo.sessionId}\`\n\n` +
                 `💡 *Use the command /deploy to get started.*`,
        sessionId: sessionInfo.sessionId
      };
    } else {
      // If we can't parse session ID, show the raw successful response
      return {
        success: true,
        message: `✅ *Pairing Successful!*\n\n` +
                 `*Bot:* ${botData.name}\n` +
                 `*Phone:* \`${phoneNumber}\`\n` +
                 `*Response:* ${JSON.stringify(response.data).substring(0, 200)}...\n\n` +
                 `📝 Check your WhatsApp for pairing code or use /deploy command.`
      };
    }

  } catch (error) {
    console.error('❌ Pairing Error:', error.message);
    
    if (error.response) {
      console.log('📊 Error Response:', error.response.status, error.response.data);
      
      // Handle specific error cases
      if (error.response.status === 400) {
        return {
          success: false,
          message: `❌ *Invalid Phone Number*\n\n` +
                   `Please check your phone number format.\n` +
                   `*Example:* 254712345678\n\n` +
                   `💡 Use country code + number (no + sign)`
        };
      } else if (error.response.status === 429) {
        return {
          success: false,
          message: `⏳ *Too Many Requests*\n\n` +
                   `Please wait a few minutes before trying again.`
        };
      }
    }
    
    return {
      success: false,
      message: `❌ *Pairing Failed*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Error:* ${error.message}\n\n` +
               `💡 *Please try:*\n` +
               `• Using the bot's official pairing site directly\n` +
               `• Checking if your number is correct\n` +
               `• Trying again in a few minutes`
    };
  }
}

function extractSessionInfo(responseData) {
  console.log('🔍 Extracting session info from response...');
  
  if (!responseData) {
    return { success: false, error: 'Empty response' };
  }
  
  // Convert to string for searching
  const responseStr = JSON.stringify(responseData);
  
  // Look for session ID patterns (like "4IKYM-8YY4!")
  const sessionIdMatch = responseStr.match(/([A-Z0-9]{4,6}-[A-Z0-9]{4,6}!?)/);
  if (sessionIdMatch) {
    return { success: true, sessionId: sessionIdMatch[1] };
  }
  
  // Common session ID fields
  if (responseData.sessionId) {
    return { success: true, sessionId: responseData.sessionId };
  }
  if (responseData.sessionID) {
    return { success: true, sessionId: responseData.sessionID };
  }
  if (responseData.session_id) {
    return { success: true, sessionId: responseData.session_id };
  }
  if (responseData.sessId) {
    return { success: true, sessionId: responseData.sessId };
  }
  if (responseData.id) {
    return { success: true, sessionId: responseData.id };
  }
  
  // Check for success messages with codes
  if (responseData.message && responseData.message.includes('Session')) {
    const sessionMatch = responseData.message.match(/([A-Z0-9-]+!?)/);
    if (sessionMatch) {
      return { success: true, sessionId: sessionMatch[1] };
    }
  }
  
  // If it's a string response, look for session-like patterns
  if (typeof responseData === 'string') {
    const sessionMatch = responseData.match(/([A-Z0-9]{4,6}-[A-Z0-9]{4,6}!?)/);
    if (sessionMatch) {
      return { success: true, sessionId: sessionMatch[1] };
    }
    
    // If it's just a success message
    if (responseData.includes('success') || responseData.includes('paired')) {
      return { success: true, sessionId: 'Check WhatsApp for code' };
    }
  }
  
  return { success: false, error: 'No session ID found in response' };
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
      `⏳ *Pairing with ${botData.name}...*\n\n` +
      `📱 Sending: ${messageText}\n` +
      `🌐 Connecting to pairing service...`,
      { parse_mode: 'Markdown' }
    );
    
    // GET REAL SESSION ID
    const result = await getRealSessionID(session.pairingBot, messageText);
    
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
    console.log('🎉 Pairing hub running! Ready for session IDs.');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
