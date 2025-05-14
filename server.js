require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// CORS setup
app.use(cors({
  origin: '*', // You can restrict this to your frontend domain if needed
}));
app.use(express.json());

// Token tracking
let totalTokensUsed = 0;
let requestCount = 0;

const logUsageSummary = (response, tokensUsed, estimatedCost) => {
  console.log('\n=== Token Usage Summary ===');
  console.log(Request #: ${++requestCount});
  console.log(Input tokens: ${response.data.usage.prompt_tokens});
  console.log(Output tokens: ${response.data.usage.completion_tokens});
  console.log(Total tokens: ${tokensUsed});
  console.log(This request cost: $${estimatedCost.toFixed(4)});
  console.log(Running total: $${((totalTokensUsed / 1000) * 0.09).toFixed(4)});
  console.log('---------------------------\n');
};

// ✅ Default route to prevent 404
app.get('/', (req, res) => {
  res.send('🟢 Backend is running! Use POST /api/chat to interact.');
});

// ✅ Main Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.MODEL_NAME || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert AI assistant. Format ALL responses exactly like this, using explicit newlines:

1. Main Topic Name\n

1.1. First Point Name\n
• Brief definition on a single line\n
• Key characteristic 1 on its own line\n
• Key characteristic 2 on its own line\n
• Example: code or practical example\n\n

1.2. Second Point Name\n
• Brief definition on a single line\n
• Key characteristic 1 on its own line\n
• Key characteristic 2 on its own line\n
• Example: code or practical example\n\n

2. Code Examples\n

\\\`python
# Each example starts on a new line
def example():
    pass
\\\`\n

3. Best Practices\n

3.1. First Practice\n
• Description on its own line\n
• Implementation details on new line\n
• Example on separate line\n\n

3.2. Second Practice\n
• Description on its own line\n
• Implementation details on new line\n
• Example on separate line\n\n

Formatting Rules:
- Add \\n after each point
- Add \\n\\n between major sections
- Never continue text on same line
- Start each point on new line
- Keep consistent spacing throughout`
          },
          ...req.body.messages
        ],
        temperature: 0.5,
        max_tokens: 800,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      },
      {
        headers: {
          'Authorization': Bearer ${process.env.OPENAI_API_KEY.trim()},
          'Content-Type': 'application/json'
        }
      }
    );

    const tokensUsed = response.data.usage.total_tokens;
    totalTokensUsed += tokensUsed;
    const estimatedCost = (tokensUsed / 1000) * 0.09;
    logUsageSummary(response, tokensUsed, estimatedCost);

    const rawContent = response.data.choices[0].message.content;
    const htmlFormattedContent = rawContent.replace(/\n/g, "<br>");

    res.json({
      ...response.data,
      tokenInfo: {
        inputTokens: response.data.usage.prompt_tokens,
        outputTokens: response.data.usage.completion_tokens,
        totalTokens: tokensUsed,
        estimatedCost: estimatedCost,
        requestNumber: requestCount
      },
      formattedHtml: htmlFormattedContent
    });

  } catch (error) {
    console.error('\n=== API Error ===');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.error?.message);
    console.error('----------------\n');

    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || 'Failed to get response'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('\n=== Server Started ===');
  console.log(Listening on port ${PORT});
  console.log(Using model: ${process.env.MODEL_NAME});
});
