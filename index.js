const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '7701970165:AAFmPpYOJ92MT033UoJLmxfQX7rIe703k6E';
const OPENROUTER_API_KEY = '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'; // Get from https://openrouter.ai

// Validate configuration
if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY_HERE') {
  console.error('❌ ERROR: Please set your OpenRouter API key!');
  console.log('💡 Get it from: https://openrouter.ai/api-keys');
  process.exit(1);
}

console.log('🔐 Bot token loaded:', BOT_TOKEN.substring(0, 15) + '...');
console.log('🤖 AI Model: Mistral 7B Instruct');

const bot = new Telegraf(BOT_TOKEN);

// Store conversation history
const userConversations = new Map();

// ==================== MISTRAL AI INTEGRATION ====================

async function getAIResponse(userId, message) {
  try {
    // Get or initialize conversation history
    if (!userConversations.has(userId)) {
      userConversations.set(userId, [
        { role: "system", content: "You are a helpful AI assistant. Provide clear, concise, and helpful responses." }
      ]);
    }
    
    const conversation = userConversations.get(userId);
    
    // Add user message to conversation
    conversation.push({ role: "user", content: message });
    
    // Keep only last 10 messages to manage context
    if (conversation.length > 20) {
      conversation.splice(1, 2); // Remove oldest user-assistant pair, keep system prompt
    }

    console.log(`💭 User ${userId}: ${message.substring(0, 100)}...`);
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "mistralai/mistral-7b-instruct:free",
      messages: conversation,
      max_tokens: 1000,
      temperature: 0.7,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://telegram-bot.com', // Required by OpenRouter
        'X-Title': 'Telegram AI Assistant' // Required by OpenRouter
      },
      timeout: 30000
    });

    const aiReply = response.data.choices[0].message.content;
    
    // Add AI response to conversation history
    conversation.push({ role: "assistant", content: aiReply });
    
    console.log(`🤖 AI Response: ${aiReply.substring(0, 100)}...`);
    
    return aiReply;

  } catch (error) {
    console.error('❌ AI API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return "⏳ I'm getting too many requests right now. Please try again in a moment!";
    } else if (error.response?.status === 401) {
      return "🔑 There's an issue with my AI service configuration. Please contact my developer.";
    } else if (error.code === 'ECONNABORTED') {
      return "⏰ The AI is taking too long to respond. Please try again with a shorter message.";
    } else {
      return "❌ I'm having trouble connecting to my AI brain right now. Please try again later!";
    }
  }
}

// ==================== BOT COMMANDS & HANDLERS ====================

function getMainMenu() {
  return Markup.keyboard([
    ['🧠 Ask AI', '🔄 New Chat'],
    ['ℹ️ Help', '🚀 About']
  ]).resize();
}

bot.start(async (ctx) => {
  const welcomeText = `🤖 *Welcome to AI Assistant* 🤖\n\n` +
    `I'm powered by *Mistral 7B* AI and ready to help you with:\n\n` +
    `💡 Questions & Answers\n` +
    `📚 Learning & Explanations\n` +
    `💭 Creative Writing\n` +
    `🔍 Problem Solving\n` +
    `📝 Code Help\n\n` +
    `*Just send me a message and let's chat!*`;
  
  await ctx.replyWithMarkdown(welcomeText, getMainMenu());
});

bot.help(async (ctx) => {
  const helpText = `*🤖 AI Assistant Help*\n\n` +
    `*Available Commands:*\n` +
    `/start - Start the bot\n` +
    `/newchat - Start a new conversation\n` +
    `/help - Show this help message\n\n` +
    `*Quick Actions:*\n` +
    `• Use the menu buttons below\n` +
    `• Or just type your message directly\n\n` +
    `*Tips:*\n` +
    `• I remember our conversation context\n` +
    `• Use /newchat to clear memory\n` +
    `• I'm best with clear, specific questions`;
  
  await ctx.replyWithMarkdown(helpText, getMainMenu());
});

bot.command('newchat', async (ctx) => {
  userConversations.delete(ctx.from.id);
  await ctx.replyWithMarkdown(
    `🔄 *New chat started!*\n\nI've cleared our conversation history. What would you like to talk about?`,
    getMainMenu()
  );
});

// Handle menu buttons
bot.hears('🧠 Ask AI', async (ctx) => {
  await ctx.reply('💭 What would you like to ask me? I\'m ready to help!');
});

bot.hears('🔄 New Chat', async (ctx) => {
  userConversations.delete(ctx.from.id);
  await ctx.reply('🔄 Started a fresh conversation! What\'s on your mind?');
});

bot.hears('ℹ️ Help', async (ctx) => {
  await ctx.replyWithMarkdown(
    `*Need help?*\n\nJust send me any message and I'll respond! Use /newchat to clear our conversation history.`,
    getMainMenu()
  );
});

bot.hears('🚀 About', async (ctx) => {
  await ctx.replyWithMarkdown(
    `*🤖 About Me*\n\n` +
    `• *AI Model:* Mistral 7B Instruct\n` +
    `• *Powered by:* OpenRouter API\n` +
    `• *Features:* Context-aware conversations\n` +
    `• *Skills:* Q&A, writing, coding, analysis\n\n` +
    `I'm here to help you with anything! Just start chatting.`
  );
});

// Handle all text messages
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userMessage = ctx.message.text;
  
  // Ignore menu commands we already handled
  if (['🧠 Ask AI', '🔄 New Chat', 'ℹ️ Help', '🚀 About'].includes(userMessage)) {
    return;
  }
  
  // Show typing action
  await ctx.sendChatAction('typing');
  
  try {
    const loadingMsg = await ctx.reply('💭 Thinking...');
    
    const aiResponse = await getAIResponse(userId, userMessage);
    
    await ctx.deleteMessage(loadingMsg.message_id);
    await ctx.replyWithMarkdown(aiResponse, getMainMenu());
    
  } catch (error) {
    console.error('Bot error:', error);
    await ctx.replyWithMarkdown(
      '❌ Sorry, I encountered an error. Please try again!',
      getMainMenu()
    );
  }
});

// Handle non-text messages
bot.on('message', async (ctx) => {
  await ctx.replyWithMarkdown(
    '📝 I currently only understand text messages. Please send me a text message!',
    getMainMenu()
  );
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  ctx.replyWithMarkdown(
    '❌ An unexpected error occurred. Please try again!',
    getMainMenu()
  );
});

// ==================== START BOT ====================

async function startBot() {
  try {
    console.log('🚀 Starting AI Chatbot...');
    console.log('🤖 Model: Mistral 7B Instruct');
    console.log('🌐 API: OpenRouter');
    
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connected: @' + botInfo.username);
    
    await bot.launch();
    console.log('🎉 AI Chatbot is running! Send a message to test.');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
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
