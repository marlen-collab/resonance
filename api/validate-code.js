export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, action, recordId, firstUsedAt, expiresAt } = req.body;
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = 'Access Codes';

  if (!token || !baseId) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // ACTION: validate — check code against Airtable
    if (action === 'validate') {
      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(`{Code}="$UPPER({Code})="${code.toUpperCase()}"

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!data.records || data.records.length === 0) {
        return res.status(200).json({ valid: false, reason: 'not_found' });
      }

      const record = data.records[0];
      const fields = record.fields;
      const status = fields['Status'] || '';

      if (status === 'Revoked' || status === 'Expired') {
        return res.status(200).json({ valid: false, reason: 'expired', recordId: record.id });
      }

      const now = Date.now();
      let firstUsed = fields['First Used At'] ? parseInt(fields['First Used At']) : null;
      let expires = fields['Expires At'] ? parseInt(fields['Expires At']) : null;
      const ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;

      // First time use — activate
      if (!firstUsed) {
        firstUsed = now;
        expires = now + ACCESS_DURATION_MS;

        await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'First Used At': String(firstUsed),
              'Expires At': String(expires),
              'Status': 'Active'
            }
          })
        });
      }

      // Check expiry
      if (now > expires) {
        await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: { 'Status': 'Expired' } })
        });
        return res.status(200).json({ valid: false, reason: 'expired', recordId: record.id });
      }

      return res.status(200).json({
        valid: true,
        recordId: record.id,
        firstUsedAt: firstUsed,
        expiresAt: expires
      });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
