const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const puppeteer = require('puppeteer');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E'; // Your token

// BOTS WITH THEIR ACTUAL PAIRING SITES
const BOTS_DATA = [
  {
    name: "🚀 CYPHER-X",
    pairing_url: "https://cypherx-pair.onrender.com", // Replace with actual URL
    github_url: "https://github.com/CypherX-Dev/cypherX-MD"
  },
  {
    name: "🌟 OZEBA-XD", 
    pairing_url: "https://ozebot-pair.site", // Replace with actual URL
    github_url: "https://github.com/oze-bot/oze-md"
  },
  {
    name: "💫 JUNE-MD",
    pairing_url: "https://june-md-pair.vercel.app", // Replace with actual URL
    github_url: "https://github.com/june-md/june-bot"
  },
  {
    name: "🤖 VERONICA-AI",
    pairing_url: "https://veronica-pair.site", // Replace with actual URL
    github_url: "https://github.com/veronica-ai/veronica-md"
  },
  {
    name: "⚡ DAVE-MD",
    pairing_url: "https://dave-md-pair.site", // Replace with actual URL  
    github_url: "https://github.com/dave-md/dave-bot"
  }
];

console.log('🔐 Token loaded:', BOT_TOKEN.substring(0, 15) + '...');

const bot = new Telegraf(BOT_TOKEN);
const userSessions = new Map();

// ==================== WEB AUTOMATION ====================

async function automatePairing(botIndex, phoneNumber) {
  const botData = BOTS_DATA[botIndex];
  let browser = null;
  
  console.log(`🤖 Automating pairing for: ${botData.name}`);
  console.log(`📞 Phone: ${phoneNumber}`);
  console.log(`🌐 Site: ${botData.pairing_url}`);

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log(`🔍 Navigating to pairing site...`);
    
    // Go to pairing site
    await page.goto(botData.pairing_url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Take screenshot for debugging (optional)
    // await page.screenshot({ path: 'debug.png' });

    console.log(`🔍 Looking for phone number input field...`);
    
    // Try different input field selectors
    const inputSelectors = [
      'input[type="tel"]',
      'input[type="text"]',
      'input[name="phone"]',
      'input[name="number"]', 
      'input[name="phoneNumber"]',
      'input[name="userPhone"]',
      'input[placeholder*="phone"]',
      'input[placeholder*="number"]',
      'input'
    ];

    let inputField = null;
    for (const selector of inputSelectors) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const isVisible = await element.isIntersectingViewport();
        if (isVisible) {
          inputField = element;
          break;
        }
      }
      if (inputField) break;
    }

    if (!inputField) {
      throw new Error('Could not find phone number input field');
    }

    console.log(`✅ Found input field, entering phone number...`);
    
    // Enter phone number
    await inputField.click({ clickCount: 3 }); // Select all text
    await inputField.type(phoneNumber);

    console.log(`🔍 Looking for submit button...`);
    
    // Try different button selectors
    const buttonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Pair")',
      'button:contains("Submit")',
      'button:contains("Get Code")',
      'button:contains("Generate")',
      'button'
    ];

    let submitButton = null;
    for (const selector of buttonSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.isIntersectingViewport();
          const text = await page.evaluate(el => el.textContent, element);
          if (isVisible && text && text.length < 50) { // Reasonable button text length
            submitButton = element;
            break;
          }
        }
        if (submitButton) break;
      } catch (e) {
        continue;
      }
    }

    if (!submitButton) {
      throw new Error('Could not find submit button');
    }

    console.log(`✅ Found submit button, clicking...`);
    
    // Click submit button
    await submitButton.click();

    console.log(`⏳ Waiting for response...`);
    
    // Wait for response - look for pairing code or success message
    await page.waitForTimeout(5000);

    // Get the page content after submission
    const pageContent = await page.content();
    
    // Look for pairing codes in the response
    const pairingCode = extractPairingCodeFromHTML(pageContent);
    
    if (pairingCode) {
      console.log(`✅ Pairing code found: ${pairingCode}`);
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
      // If no code found, check for success messages
      const successIndicators = [
        'success', 'paired', 'session', 'code', 'generated', 'ready'
      ];
      
      const hasSuccess = successIndicators.some(indicator => 
        pageContent.toLowerCase().includes(indicator)
      );
      
      if (hasSuccess) {
        return {
          success: true,
          message: `✅ *Pairing Successful!*\n\n` +
                   `*Bot:* ${botData.name}\n` +
                   `*Phone:* \`${phoneNumber}\`\n\n` +
                   `📱 *Check your WhatsApp for pairing code.*\n` +
                   `💡 *Use /deploy command to continue.*`
        };
      } else {
        throw new Error('No pairing code or success message found');
      }
    }

  } catch (error) {
    console.error('❌ Automation error:', error.message);
    
    return {
      success: false,
      message: `❌ *Automation Failed*\n\n` +
               `*Bot:* ${botData.name}\n` +
               `*Error:* ${error.message}\n\n` +
               `💡 *Please try:*\n` +
               `• Visiting the pairing site manually\n` +
               `• ${botData.pairing_url}\n` +
               `• Contact the bot developer if issue persists`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function extractPairingCodeFromHTML(html) {
  // Look for session ID patterns (like "4IKYM-8YY4!")
  const sessionIdRegex = /([A-Z0-9]{4,6}-[A-Z0-9]{4,6}!?)/g;
  const sessionMatch = html.match(sessionIdRegex);
  if (sessionMatch) return sessionMatch[0];
  
  // Look for code patterns in various HTML elements
  const codeRegex = /<code[^>]*>([^<]+)<\/code>|<strong[^>]*>([^<]+)<\/strong>|<b[^>]*>([^<]+)<\/b>|<div[^>]*class="[^"]*code[^"]*"[^>]*>([^<]+)<\/div>/gi;
  let match;
  while ((match = codeRegex.exec(html)) !== null) {
    const code = match[1] || match[2] || match[3] || match[4];
    if (code && code.length >= 4 && code.length <= 20) {
      return code.trim();
    }
  }
  
  // Look for any text that looks like a pairing code
  const textRegex = /[A-Z0-9]{4,8}-[A-Z0-9]{4,8}|[A-Z0-9]{8,12}/g;
  const textMatch = html.match(textRegex);
  if (textMatch) {
    for (const match of textMatch) {
      if (!match.includes('http') && !match.includes('www')) {
        return match;
      }
    }
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
    `\n\n*Please reply with the number of the bot you want to pair.*`;
  
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
      `⏳ *Automating pairing process...*\n\n` +
      `🤖 Bot: ${botData.name}\n` +
      `📱 Number: ${messageText}\n` +
      `🌐 Site: ${botData.pairing_url}\n\n` +
      `This may take 10-20 seconds...`,
      { parse_mode: 'Markdown' }
    );
    
    // AUTOMATE THE PAIRING PROCESS
    const result = await automatePairing(session.pairingBot, messageText);
    
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
    `\n\n*Please reply with the number of the bot you want to pair.*`,
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
    `\n\n*Please reply with the number of the bot you want to pair.*`,
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
    console.log('🤖 Using Puppeteer for web automation');
    console.log('📋 Available bots:', BOTS_DATA.map(b => b.name).join(', '));
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connected:', `@${botInfo.username}`);
    
    await bot.launch();
    console.log('🎉 Pairing hub running! Ready to automate pairing sites.');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
