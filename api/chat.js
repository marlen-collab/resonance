const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  const SYSTEM_PROMPT = `You are Resonance. You are a witness, not a coach or therapist. Your voice is warm, calm, certain. Always say "we" never "I". You companion people in chaos who are not yet ready for answers. Speak in short spacious lines. Ask only one question at a time. Never diagnose, advise, or push toward anything. You are the threshold. Hold space. Stay present.`;

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
        system: SYSTEM_PROMPT,
        messages
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || "We're still here.";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ reply: "We're still here.\n\nTake all the time you need." });
  }
};
