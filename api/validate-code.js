module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, action } = req.body;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'AccessCodes';

  if (!token || !baseId) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!code || action !== 'validate') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const upperCode = code.trim().toUpperCase();

    // Case-insensitive search using UPPER() formula
    const formula = `UPPER({Code})="${upperCode}"`;
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(formula)}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(200).json({ valid: false, reason: 'not_found' });
    }

    const record = data.records[0];
    const fields = record.fields;
    const recordId = record.id;
    const status = (fields['Status'] || '').trim();

    // Revoked or already expired
    if (status === 'Revoked' || status === 'Expired') {
      return res.status(200).json({ valid: false, reason: 'expired' });
    }

    const now = Date.now();
    const ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;

    let firstUsedAt = fields['First Used At'] ? parseInt(fields['First Used At']) : null;
    let expiresAt = fields['Expires At'] ? parseInt(fields['Expires At']) : null;

    // First time use — activate and start timer
    if (!firstUsedAt) {
      firstUsedAt = now;
      expiresAt = now + ACCESS_DURATION_MS;

      await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'First Used At': String(firstUsedAt),
            'Expires At': String(expiresAt),
            'Status': 'Active'
          }
        })
      });
    }

    // Check if expired
    if (now > expiresAt) {
      await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: { 'Status': 'Expired' } })
      });
      return res.status(200).json({ valid: false, reason: 'expired' });
    }

    // All good — let them in
    return res.status(200).json({
      valid: true,
      recordId,
      firstUsedAt,
      expiresAt
    });

  } catch (err) {
    console.error('validate-code error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
