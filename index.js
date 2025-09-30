const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E'; // Your token

// BOTS WITH REAL PAIRING SITES
const BOTS_DATA = [
  {
    name: "🚀 CYPHER-X",
    pairing_url: "https://pairx6-09722f5196cd.herokuapp.com/",
    github_url: "https://github.com/Dark-Xploit/CypherX",
    form_field: "number"
  },
  {
    name: "🌟 OZEBA-XD", 
    pairing_url: "YOUR_OZEBAXD_PAIRING_URL_HERE",
    github_url: "https://github.com/oze-bot/oze-md",
    form_field: "phone"
  },
  {
    name: "💫 JUNE-MD",
    pairing_url: "https://session-2s-dfa3baea9dc1.herokuapp.com/pair", 
    github_url: "https://github.com/Vinpink2/june-md?tab=readme-ov-file",
    form_field: "userNumber"
  },
  {
    name: "🤖 VERONICA-AI",
    pairing_url: "YOUR_VERONICA_PAIRING_URL_HERE",
    github_url: "https://github.com/veronica-ai/veronica-md",
    form_field: "phoneNumber"
  },
  {
    name: "⚡ DAVE-MD",
    pairing_url: "YOUR_DAVEMD_PAIRING_URL_HERE",  
    github_url: "https://github.com/dave-md/dave-bot",
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

// ==================== IMPROVED PAIRING FUNCTION ====================

async function getPairingCode(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  
  console.log(`🔌 Pairing: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 URL: ${botData.pairing_url}`);

  try {
    const formData = {
      [botData.form_field]: phoneNumber
    };

    console.log('📤 Sending:', formData);

    const response = await axios.post(botData.pairing_url, formData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pairing-Bot/1.0'
      },
      validateStatus: () => true // Don't throw on any status
    });

    console.log('✅ Response Status:', response.status);
    console.log('📦 Full Response:', JSON.stringify(response.data, null, 2));

    // BETTER CODE EXTRACTION - Look for ANY code-like patterns
    let pairingCode = extractAnyCode(response.data);
    
    if (pairingCode) {
      return {
        success: true,
        message: `✅ *Pairing Successful!*\n\n` +
                 `*Bot:* ${botData.name}\n` +
                 `*Phone:* \`${phoneNumber}\`\n` +
                 `*Pairing Code:* \`${pairingCode}\`\n\n` +
                 `💡 *Use this code in your bot deployment.*`,
        code: pairingCode
      };
    } else {
      // If no code found but request was successful, show raw response
      return {
        success: true,
        message: `✅ *Pairing Request Sent!*\n\n` +
                 `*Bot:* ${botData.name}\n` +
                 `*Phone:* \`${phoneNumber}\`\n` +
                 `*Response:* ${JSON.stringify(response.data).substring(0, 200)}...\n\n` +
                 `🔍 *The pairing site responded but no code was found in the response.*`,
        code: 'NOT_FOUND_IN_RESPONSE'
      };
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    return {
      success: false,
      message: `❌ *Pairing Failed*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Error:* ${error.message}\n\n` +
               `💡 Please try the pairing site manually.`
    };
  }
}

function extractAnyCode(responseData) {
  if (!responseData) return null;
  
  console.log('🔍 Extracting code from:', JSON.stringify(responseData));
  
  // Convert to string for pattern matching
  const responseStr = JSON.stringify(responseData);
  
  // Look for SESSION ID patterns (like "4IKYM-8YY4!")
  const sessionIdMatch = responseStr.match(/([A-Z0-9]{4,6}-[A-Z0-9]{4,6}!?)/);
  if (sessionIdMatch) {
    console.log('🎯 Found session ID:', sessionIdMatch[1]);
    return sessionIdMatch[1];
  }
  
  // Look for numeric codes (4-8 digits)
  const numericCodeMatch = responseStr.match(/"code":\s*"(\d{4,8})"/);
  if (numericCodeMatch) {
    console.log('🎯 Found numeric code:', numericCodeMatch[1]);
    return numericCodeMatch[1];
  }
  
  // Look for pairing_code field
  const pairingCodeMatch = responseStr.match(/"pairing_code":\s*"([^"]+)"/);
  if (pairingCodeMatch) {
    console.log('🎯 Found pairing_code:', pairingCodeMatch[1]);
    return pairingCodeMatch[1];
  }
  
  // Look for sessionId field
  const sessionIdFieldMatch = responseStr.match(/"sessionId":\s*"([^"]+)"/);
  if (sessionIdFieldMatch) {
    console.log('🎯 Found sessionId:', sessionIdFieldMatch[1]);
    return sessionIdFieldMatch[1];
  }
  
  // Look for any field containing "code"
  const anyCodeMatch = responseStr.match(/"([^"]*[Cc]ode[^"]*)":\s*"([^"]+)"/);
  if (anyCodeMatch) {
    console.log('🎯 Found code field:', anyCodeMatch[2]);
    return anyCodeMatch[2];
  }
  
  // Last resort: look for any 4-8 character alphanumeric string that might be a code
  const anyAlphanumericMatch = responseStr.match(/"([A-Za-z0-9]{4,8})"/);
  if (anyAlphanumericMatch && !anyAlphanumericMatch[1].includes('http')) {
    console.log('🎯 Found potential code:', anyAlphanumericMatch[1]);
    return anyAlphanumericMatch[1];
  }
  
  console.log('❌ No code patterns found in response');
  return null;
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
    `*Format:* 254712345678\n` +
    `*I'll show the pairing code here in Telegram*`,
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
    const loadingMsg = await ctx.reply('⏳ *Getting pairing code...*', { parse_mode: 'Markdown' });
    
    const result = await getPairingCode(session.pairingBot, messageText);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    // Send pairing result
    await ctx.replyWithMarkdown(
      result.message,
      Markup.inlineKeyboard([
        Markup.button.callback('🚀 Deploy', 'show_deploy'),
        Markup.button.callback('🔄 Pair Another', `pair_${session.pairingBot}`)
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
    console.log('🚀 Starting Pairing Hub...');
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot: @' + botInfo.username);
    
    await bot.launch();
    console.log('🎉 Bot running! Ready to extract pairing codes.');
    
  } catch (error) {
    console.error('❌ Bot failed:', error.message);
    process.exit(1);
  }
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
