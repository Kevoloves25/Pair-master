const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E'; // Your token

// Bot data with flexible pairing sites
const BOTS_DATA = [
  {
    name: "🚀 NOVA-XMD",
    pairing_site: "https://nova-pair-site.onrender.com",
    github_url: "https://github.com/novaxmd/NOVA-XMD",
    type: "custom_site", // Special handling for custom sites
    method: "POST",
    tested: false
  },
  {
    name: "🌟 Secktor MD",
    pairing_site: "https://secktor-api.hexa-octa-deci.ml/api/pair",
    github_url: "https://github.com/SamPandey001/Secktor-MD", 
    type: "standard_api",
    method: "POST",
    tested: true
  },
  {
    name: "💫 CypherX MD",
    pairing_site: "https://cypherx-api.vercel.app/api/pair",
    github_url: "https://github.com/CypherX-Dev/cypherX-MD",
    type: "standard_api",
    method: "POST",
    tested: false
  },
  {
    name: "🔧 Custom Pair Site",
    pairing_site: "USER_INPUT", // User can enter any site
    github_url: "https://github.com",
    type: "user_provided",
    method: "AUTO_DETECT",
    tested: false
  }
];

console.log('🔐 Token loaded:', BOT_TOKEN.substring(0, 15) + '...');

const bot = new Telegraf(BOT_TOKEN);
const userSessions = new Map();

// ==================== UNIVERSAL PAIRING HANDLER ====================

async function handleUniversalPairing(botIndex, phoneNumber, customSite = null) {
  const botData = BOTS_DATA[botIndex];
  let pairingSite = customSite || botData.pairing_site;
  
  console.log(`🌐 Universal Pairing Handler`);
  console.log(`📱 Phone: ${phoneNumber}`);
  console.log(`🔗 Site: ${pairingSite}`);
  console.log(`🤖 Bot: ${botData.name}`);
  console.log(`📝 Type: ${botData.type}`);

  // Handle user-provided custom sites
  if (botData.type === "user_provided" && pairingSite === "USER_INPUT") {
    return "❌ Please provide a valid pairing site URL first";
  }

  try {
    // Test if the site is accessible
    console.log('🔍 Testing site accessibility...');
    const siteTest = await axios.get(pairingSite, { 
      timeout: 10000,
      validateStatus: () => true // Don't throw on 404/etc
    });
    
    console.log(`📊 Site response: ${siteTest.status}`);

    // Try different API endpoints and methods
    const pairingResults = await tryAllPairingMethods(pairingSite, phoneNumber, botData.name);
    
    if (pairingResults.success) {
      return `✅ *Pairing Successful!*\n\n` +
             `*Bot:* ${botData.name}\n` +
             `*Phone:* \`${phoneNumber}\`\n` +
             `*Pairing Code:* \`${pairingResults.code}\`\n` +
             `*Method:* ${pairingResults.method}\n\n` +
             `🌐 *Site:* ${pairingSite}\n` +
             `💡 Use this code in your WhatsApp bot setup`;
    } else {
      return `❌ *Pairing Failed*\n\n` +
             `*Bot:* ${botData.name}\n` +
             `*Phone:* \`${phoneNumber}\`\n` +
             `*Site:* ${pairingSite}\n\n` +
             `*Possible Issues:*\n` +
             `• Site requires different parameters\n` +
             `• Phone number format issue\n` +
             `• Temporary site downtime\n` +
             `• Requires QR code instead\n\n` +
             `💡 *Try:* Visiting the site directly in browser`;
    }

  } catch (error) {
    console.error('❌ Pairing error:', error.message);
    
    return `❌ *Connection Failed*\n\n` +
           `*Bot:* ${botData.name}\n` +
           `*Site:* ${pairingSite}\n` +
           `*Error:* ${error.message}\n\n` +
           `💡 *Solutions:*\n` +
           `• Check if the site is online\n` +
           `• Verify the URL is correct\n` +
           `• Try using mobile data\n` +
           `• Contact bot developer`;
  }
}

async function tryAllPairingMethods(siteUrl, phoneNumber, botName) {
  console.log('🔄 Trying different pairing methods...');
  
  const methods = [
    {
      name: "JSON API POST",
      url: siteUrl.endsWith('/pair') ? siteUrl : `${siteUrl}/api/pair`,
      method: "POST",
      data: { phone: phoneNumber, number: phoneNumber }
    },
    {
      name: "Form Data POST", 
      url: siteUrl.endsWith('/pair') ? siteUrl : `${siteUrl}/pair`,
      method: "POST",
      data: `phone=${phoneNumber}&number=${phoneNumber}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    },
    {
      name: "GET with Params",
      url: `${siteUrl}?phone=${phoneNumber}&number=${phoneNumber}`,
      method: "GET"
    },
    {
      name: "Root API",
      url: siteUrl,
      method: "POST", 
      data: { phone: phoneNumber }
    }
  ];

  for (let method of methods) {
    try {
      console.log(`🔧 Trying: ${method.name} - ${method.url}`);
      
      const config = {
        timeout: 10000,
        headers: method.headers || { 'Content-Type': 'application/json' },
        validateStatus: () => true
      };

      let response;
      
      if (method.method === "POST") {
        response = await axios.post(method.url, method.data, config);
      } else {
        response = await axios.get(method.url, config);
      }

      console.log(`📨 Response: ${response.status}`);
      
      // Parse response
      const code = extractPairingCode(response.data);
      if (code && code !== "000000" && !code.includes("dummy")) {
        console.log(`✅ Success with ${method.name}: ${code}`);
        return { success: true, code: code, method: method.name };
      }
      
    } catch (error) {
      console.log(`❌ ${method.name} failed: ${error.message}`);
    }
  }
  
  return { 
    success: false, 
    error: "All pairing methods failed. Site may use QR code pairing." 
  };
}

function extractPairingCode(responseData) {
  if (!responseData) return null;
  
  console.log('🔍 Extracting code from:', JSON.stringify(responseData).substring(0, 200));
  
  // Try different response formats
  if (typeof responseData === 'string') {
    // Look for codes in text
    const codeMatch = responseData.match(/\b\d{4,8}\b/);
    return codeMatch ? codeMatch[0] : null;
  }
  
  if (typeof responseData === 'object') {
    // Common API response formats
    if (responseData.pairing_code) return responseData.pairing_code;
    if (responseData.code) return responseData.code;
    if (responseData.result && responseData.result.code) return responseData.result.code;
    if (responseData.data && responseData.data.code) return responseData.data.code;
    if (responseData.message) {
      const codeMatch = responseData.message.match(/\b\d{4,8}\b/);
      return codeMatch ? codeMatch[0] : null;
    }
  }
  
  return null;
}

// ==================== BOT HANDLERS ====================

function getMainMenu() {
  const buttons = BOTS_DATA.map((bot, index) => [
    Markup.button.callback(
      `${bot.tested ? '✅' : '🔍'} ${bot.name}`, 
      `pair_${index}`
    ),
    Markup.button.url(`📂 Repo`, bot.github_url)
  ]);
  
  buttons.push([Markup.button.callback('🌐 Add Custom Site', 'custom_site')]);
  buttons.push([Markup.button.callback('🔄 Refresh', 'refresh_menu')]);
  
  return Markup.inlineKeyboard(buttons);
}

bot.start(async (ctx) => {
  const welcomeText = `🤖 *Universal Pairing Hub* 🤖\n\n` +
    `*Now Supports Any Pairing Site!*\n` +
    `✅ NOVA-XMD & custom sites\n` +
    `✅ Multiple API methods\n` +
    `✅ Smart endpoint detection\n\n` +
    `*Available Bots:*\n` +
    BOTS_DATA.map((bot, index) => 
      `${index + 1}. ${bot.name}`
    ).join('\n') +
    `\n\n*Try NOVA-XMD or add your own site!*`;
  
  await ctx.replyWithMarkdown(welcomeText, getMainMenu());
});

bot.action(/pair_(\d+)/, async (ctx) => {
  const botIndex = parseInt(ctx.match[1]);
  const botData = BOTS_DATA[botIndex];
  
  userSessions.set(ctx.from.id, { 
    pairingBot: botIndex,
    step: 'awaiting_phone'
  });
  
  let messageText = '';
  
  if (botData.type === "user_provided") {
    messageText = `🌐 *Custom Pairing Site*\n\n` +
      `Please send me the pairing site URL first:\n\n` +
      `*Example:*\n` +
      `https://your-pair-site.herokuapp.com\n` +
      `https://custom-api.render.com/pair\n\n` +
      `Then I'll ask for your phone number.`;
    
    userSessions.set(ctx.from.id, { 
      pairingBot: botIndex,
      step: 'awaiting_site'
    });
  } else {
    messageText = `🔑 *Pairing ${botData.name}*\n\n` +
      `🌐 *Pairing Site:*\n\`${botData.pairing_site}\`\n\n` +
      `Please enter your phone number:\n\n` +
      `*Format:* CountryCode+Number\n` +
      `*Example:* 254712345678\n\n` +
      `⚡ *Universal API Handler Active*`;
  }
  
  await ctx.editMessageText(
    messageText,
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu')
      ])
    }
  );
});

bot.action('custom_site', async (ctx) => {
  userSessions.set(ctx.from.id, {
    pairingBot: BOTS_DATA.findIndex(b => b.type === "user_provided"),
    step: 'awaiting_site'
  });
  
  await ctx.editMessageText(
    `🌐 *Add Custom Pairing Site*\n\n` +
    `Send me the pairing site URL:\n\n` +
    `*Supported Formats:*\n` +
    `• https://site-name.render.com\n` +
    `• https://api-site.vercel.app/pair\n` +
    `• https://custom-bot-api.herokuapp.com\n\n` +
    `*Example:*\n\`https://nova-pair-site.onrender.com\``,
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
  
  if (!session) return;
  
  const botData = BOTS_DATA[session.pairingBot];
  
  if (session.step === 'awaiting_site') {
    // User is providing a custom site URL
    if (!messageText.startsWith('http')) {
      await ctx.reply(
        '❌ *Invalid URL*\n\n' +
        'Please provide a valid URL starting with http:// or https://\n\n' +
        '*Example:* https://nova-pair-site.onrender.com',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            Markup.button.callback('« Try Again', 'custom_site')
          ])
        }
      );
      return;
    }
    
    // Store the custom site and ask for phone number
    userSessions.set(userId, {
      ...session,
      customSite: messageText,
      step: 'awaiting_phone'
    });
    
    await ctx.reply(
      `✅ *Site Saved*\n\n` +
      `🌐 ${messageText}\n\n` +
      `Now enter your phone number:\n\n` +
      `*Format:* CountryCode+Number\n` +
      `*Example:* 254712345678`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback('« Cancel', 'back_to_menu')
        ])
      }
    );
    
  } else if (session.step === 'awaiting_phone') {
    // User is providing phone number
    const phoneRegex = /^\d{10,15}$/;
    
    if (!phoneRegex.test(messageText)) {
      await ctx.reply(
        '❌ *Invalid phone number*\n\n' +
        'Please enter 10-15 digits only:\n\n' +
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
    
    const loadingMsg = await ctx.reply(
      `🔍 *Connecting to Pairing Site...*\n\n` +
      `🤖 ${botData.name}\n` +
      `📱 ${messageText}\n` +
      `🌐 ${session.customSite || botData.pairing_site}\n\n` +
      `Trying multiple API methods...`,
      { parse_mode: 'Markdown' }
    );
    
    // Call universal pairing handler
    const result = await handleUniversalPairing(
      session.pairingBot, 
      messageText, 
      session.customSite
    );
    
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.replyWithMarkdown(
      result,
      Markup.inlineKeyboard([
        Markup.button.callback('« Back to Menu', 'back_to_menu'),
        Markup.button.callback('🔄 Try Another', 'refresh_menu')
      ])
    );
    
    userSessions.delete(userId);
  }
});

// ... (keep other handlers like back_to_menu, refresh_menu from previous versions)

bot.action('back_to_menu', async (ctx) => {
  userSessions.delete(ctx.from.id);
  await ctx.editMessageText(
    `🤖 *Universal Pairing Hub* 🤖\n\n` +
    `*Supports Any Pairing Site*\n` +
    `Select a bot or add custom site:`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

bot.action('refresh_menu', async (ctx) => {
  userSessions.delete(ctx.from.id);
  await ctx.editMessageText(
    `🔄 Menu refreshed!\n\n` +
    `*Universal Pairing Hub Ready*\n` +
    `Select a bot to get started:`,
    { 
      parse_mode: 'Markdown',
      ...getMainMenu() 
    }
  );
});

// ==================== BOT STARTUP ====================

async function startBot() {
  try {
    console.log('🚀 Starting Universal Pairing Hub...');
    console.log('🌐 Supports: NOVA-XMD, Custom Sites, Multiple APIs');
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connected:', `@${botInfo.username}`);
    
    await bot.launch();
    console.log('🎉 Universal hub running! Ready for any pairing site.');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
