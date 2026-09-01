// sync-conversation.js — Created September 1, 2026
// Saves and loads a person's conversation history to Airtable, keyed by their
// access code's recordId. This is what lets someone return on a different
// device (or after clearing their browser) and pick up where they left off,
// instead of starting from zero every time.
//
// Reuses the same AIRTABLE_TOKEN / AIRTABLE_BASE_ID env vars as validate-code.js.
// Requires a "Conversation" (Long text) field added to the access codes table.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recordId, action, messages } = req.body;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'tblqNCaJkCXWDQKqW'; // same table validate-code.js uses

  if (!token || !baseId) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  if (!recordId || !action) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    if (action === 'save') {
      await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: { 'Conversation': JSON.stringify(messages || []) }
        })
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'load') {
      const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}/${recordId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const raw = data.fields && data.fields['Conversation'];
      let loadedMessages = [];
      if (raw) {
        try { loadedMessages = JSON.parse(raw); } catch (e) { loadedMessages = []; }
      }
      return res.status(200).json({ ok: true, messages: loadedMessages });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
