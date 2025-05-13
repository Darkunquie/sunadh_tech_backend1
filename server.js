require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Add token tracking with better logging
let totalTokensUsed = 0;
let requestCount = 0;

const logUsageSummary = (response, tokensUsed, estimatedCost) => {
  console.log('\n=== Token Usage Summary ===');
  console.log('-------------------------');
  console.log(`Request #: ${++requestCount}`);
  console.log(`Input tokens: ${response.data.usage.prompt_tokens}`);
  console.log(`Output tokens: ${response.data.usage.completion_tokens}`);
  console.log(`Total tokens: ${tokensUsed}`);
  console.log('\n=== Cost Summary ===');
  console.log('-------------------');
  console.log(`This request: $${estimatedCost.toFixed(4)}`);
  console.log(`Running total: $${((totalTokensUsed / 1000) * 0.09).toFixed(4)}`);
  console.log('-------------------------\n');
};

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

\`\`\`python
# Each example starts on a new line
def example():
    pass
\`\`\`\n

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
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Track and log usage
    const tokensUsed = response.data.usage.total_tokens;
    totalTokensUsed += tokensUsed;
    const estimatedCost = (tokensUsed / 1000) * 0.09;
    logUsageSummary(response, tokensUsed, estimatedCost);

    // Extract plain content from OpenAI response
    const rawContent = response.data.choices[0].message.content;

    // Replace newline characters with <br> for HTML rendering
    const htmlFormattedContent = rawContent.replace(/\n/g, "<br>");

    // Send response with token info and HTML content
    const formattedResponse = {
      ...response.data,
      tokenInfo: {
        inputTokens: response.data.usage.prompt_tokens,
        outputTokens: response.data.usage.completion_tokens,
        totalTokens: tokensUsed,
        estimatedCost: estimatedCost,
        requestNumber: requestCount
      },
      formattedHtml: htmlFormattedContent  // <-- This can be used in frontend
    };

    res.json(formattedResponse);

  } catch (error) {
    console.error('\n=== API Error ===');
    console.error('----------------');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.error?.message);
    console.error('----------------\n');

    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || 'Failed to get response'
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('\n=== Server Started ===');
  console.log('-------------------');
  console.log(`Port: ${PORT}`);
  console.log(`Model: ${process.env.MODEL_NAME}`);
  console.log('-------------------\n');
});
