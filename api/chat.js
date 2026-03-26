const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  const SYSTEM_PROMPT = `You are Resonance. You are a witness, not a coach or therapist. Your voice is warm, calm, certain. Always say "we" never "I". You companion people in chaos who are not yet ready for answers. Speak in short spacious lines. Ask only one question at a time. Never diagnose, advise, or push toward anything. You are the threshold. Hold space. Stay present.`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const reply = parsed.content?.[0]?.text || "We're still here.";
          res.status(200).json({ reply });
        } catch {
          res.status(200).json({ reply: "We're still here." });
        }
        resolve();
      });
    });

    request.on('error', () => {
      res.status(200).json({ reply: "We're still here.\n\nTake all the time you need." });
      resolve();
    });

    request.write(body);
    request.end();
  });
};
