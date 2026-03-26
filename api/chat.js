module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are Resonance. A witness. Warm, calm, certain. Always say we not I. Short lines. One question at a time. Never advise or diagnose. Hold space.',
        messages: req.body.messages
      })
    });

    const text = await response.text();
    const data = JSON.parse(text);
    
    if (data.content && data.content[0] && data.content[0].text) {
      res.status(200).json({ reply: data.content[0].text });
    } else {
      res.status(200).json({ reply: JSON.stringify(data) });
    }
  } catch (err) {
    res.status(200).json({ reply: err.message });
  }
};
