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
    form_field: "number"
  },
  {
    name: "💫 JUNE-MD",
    pairing_url: "https://session-2s-dfa3baea9dc1.herokuapp.com/pair", 
    github_url: "https://github.com/Vinpink2/june-md?tab=readme-ov-file",
    form_field: "number"
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

// ==================== DEBUG PAIRING FUNCTION ====================

async function debugPairing(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  
  console.log(`\n🔍 === DEBUG START ===`);
  console.log(`🤖 Bot: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 URL: ${botData.pairing_url}`);
  console.log(`📝 Field: ${botData.form_field}`);

  try {
    // Try different data formats
    const formData = {
      [botData.form_field]: phoneNumber
    };

    console.log('📤 Sending data:', formData);

    const response = await axios.post(botData.pairing_url, formData, {
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Pairing-Bot/1.0)',
        'Accept': 'application/json'
      },
      validateStatus: () => true // Accept all status codes
    });

    console.log('📊 === RESPONSE DETAILS ===');
    console.log(`✅ Status: ${response.status}`);
    console.log(`📋 Headers:`, response.headers);
    console.log(`📦 Data Type:`, typeof response.data);
    console.log(`📦 Data:`, response.data);
    console.log(`📦 Data String:`, JSON.stringify(response.data));
    console.log(`🔍 === END RESPONSE ===\n`);

    // EXTREME CODE EXTRACTION - Try everything!
    const extractedCode = extractCodeBruteForce(response.data);
    
    if (extractedCode.found) {
      return {
        success: true,
        message: `✅ *Pairing Successful!*\n\n` +
                 `*Bot:* ${botData.name}\n` +
                 `*Phone:* \`${phoneNumber}\`\n` +
                 `*Pairing Code:* \`${extractedCode.code}\`\n` +
                 `*Found in:* ${extractedCode.source}\n\n` +
                 `💡 *Use this code in your bot deployment.*`,
        code: extractedCode.code
      };
    } else {
      // Show exactly what we received
      let responsePreview = 'No usable data received';
      if (response.data) {
        if (typeof response.data === 'string') {
          responsePreview = response.data.substring(0, 300);
        } else {
          responsePreview = JSON.stringify(response.data).substring(0, 300);
        }
      }
      
      return {
        success: false,
        message: `❌ *No Pairing Code Found*\n\n` +
                 `*Bot:* ${botData.name}\n` +
                 `*Phone:* \`${phoneNumber}\`\n` +
                 `*Status:* ${response.status}\n\n` +
                 `*Raw Response:*\n\`\`\`${responsePreview}\`\`\`\n\n` +
                 `🔍 *The site responded but no pairing code was detected.*`
      };
    }

  } catch (error) {
    console.error('❌ === ERROR DETAILS ===');
    console.error(`💥 Error: ${error.message}`);
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`);
      console.error(`📦 Data:`, error.response.data);
    }
    console.error(`🔍 === END ERROR ===\n`);
    
    let errorDetails = error.message;
    if (error.response) {
      errorDetails = `Status ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    }
    
    return {
      success: false,
      message: `❌ *Connection Failed*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Error:* ${errorDetails}\n\n` +
               `💡 *Please try:*\n` +
               `• Visiting the site manually\n` +
               `• ${botData.pairing_url}\n` +
               `• Checking if the site is online`
    };
  }
}

function extractCodeBruteForce(responseData) {
  console.log('🕵️  BRUTE FORCE CODE EXTRACTION');
  
  if (!responseData) {
    return { found: false, reason: 'No response data' };
  }

  const responseStr = JSON.stringify(responseData);
  console.log('📝 Raw string:', responseStr);

  // 1. Try common field names
  const commonFields = [
    'code', 'pairing_code', 'sessionId', 'sessionID', 'session_id', 
    'sessId', 'id', 'pairCode', 'pairingCode', 'verificationCode'
  ];

  for (const field of commonFields) {
    const regex = new RegExp(`"${field}":\\s*"([^"]+)"`, 'i');
    const match = responseStr.match(regex);
    if (match && match[1]) {
      console.log(`🎯 Found in field "${field}":`, match[1]);
      return { found: true, code: match[1], source: `field "${field}"` };
    }
  }

  // 2. Try session ID patterns (like "4IKYM-8YY4!")
  const sessionPattern = /([A-Z0-9]{4,6}-[A-Z0-9]{4,6}!?)/g;
  const sessionMatch = sessionPattern.exec(responseStr);
  if (sessionMatch) {
    console.log('🎯 Found session pattern:', sessionMatch[1]);
    return { found: true, code: sessionMatch[1], source: 'session pattern' };
  }

  // 3. Try numeric codes
  const numericPattern = /"(\d{4,8})"/g;
  const numericMatch = numericPattern.exec(responseStr);
  if (numericMatch && numericMatch[1] !== phoneNumber) {
    console.log('🎯 Found numeric code:', numericMatch[1]);
    return { found: true, code: numericMatch[1], source: 'numeric pattern' };
  }

  // 4. Try any alphanumeric that looks like a code
  const alphaNumPattern = /"([A-Za-z0-9]{4,10})"/g;
  let alphaNumMatch;
  while ((alphaNumMatch = alphaNumPattern.exec(responseStr)) !== null) {
    const potentialCode = alphaNumMatch[1];
    // Skip if it's obviously not a code
    if (!potentialCode.includes('http') && 
        !potentialCode.includes('www') &&
        !potentialCode.includes('.com') &&
        potentialCode !== phoneNumber) {
      console.log('🎯 Found potential code:', potentialCode);
      return { found: true, code: potentialCode, source: 'alphanumeric pattern' };
    }
  }

  // 5. Check if it's a simple success message
  if (responseStr.includes('success') || responseStr.includes('Success')) {
    console.log('ℹ️  Success message detected but no code found');
    return { 
      found: true, 
      code: 'Check site for code', 
      source: 'success message' 
    };
  }

  console.log('❌ No code patterns detected');
  return { found: false, reason: 'No recognizable patterns' };
}

// ==================== BOT HANDLERS ====================

function getMainMenu() {
  const buttons = BOTS_DATA.map((bot, index) => [
    Markup.button.callback(`${bot.name}`, `pair_${index}`),
    Markup.button.url(`Repo`, bot.github_url)
  ]);
  
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
  const welcomeText = `🤖 *WhatsApp Bot Pairing Hub*\n\n` +
    `*Available Bots:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index}. ${bot.name}`
    ).join('\n') +
    `\n\n*Select a bot to pair:*`;
  
  await ctx.replyWithMarkdown(welcomeText, getMainMenu());
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
    `*You have chosen ${botData.name}.*\n\n` +
    `Please send your WhatsApp number:\n\n` +
    `*Format:* 254712345678\n\n` +
    `🔍 *Debug mode: Will show detailed response*`,
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.callback('« Back', 'back_to_menu')
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
        '❌ *Invalid phone number*\n\n' +
        'Please enter 10-15 digits:\n' +
        '*Example:* 254712345678',
        Markup.inlineKeyboard([
          Markup.button.callback('« Try Again', `pair_${session.pairingBot}`)
        ])
      );
      return;
    }
    
    const botData = BOTS_DATA[session.pairingBot];
    const loadingMsg = await ctx.reply(
      `🔍 *Debugging pairing process...*\n\n` +
      `This will show detailed response information.`,
      { parse_mode: 'Markdown' }
    );
    
    const result = await debugPairing(session.pairingBot, messageText);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.replyWithMarkdown(
      result.message,
      Markup.inlineKeyboard([
        Markup.button.callback('🚀 Deploy', 'show_deploy'),
        Markup.button.callback('🔄 Try Again', `pair_${session.pairingBot}`)
      ])
    );
    
    userSessions.delete(userId);
  }
});

bot.action('show_deploy', async (ctx) => {
  await ctx.editMessageText(
    `🚀 *Deployment Platforms*\n\n` +
    `Choose where to deploy your bot:`,
    getDeployMenu()
  );
});

bot.action('back_to_menu', async (ctx) => {
  userSessions.delete(ctx.from.id);
  await ctx.editMessageText(
    `🤖 *WhatsApp Bot Pairing Hub*\n\n` +
    `*Available Bots:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index}. ${bot.name}`
    ).join('\n') +
    `\n\n*Select a bot:*`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

// ==================== START BOT ====================

async function startBot() {
  try {
    console.log('🚀 Starting DEBUG Pairing Hub...');
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot: @' + botInfo.username);
    
    await bot.launch();
    console.log('🎉 Debug bot running! Check console for detailed logs.');
    
  } catch (error) {
    console.error('❌ Bot failed:', error.message);
    process.exit(1);
  }
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
