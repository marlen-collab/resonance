// v2
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { code, action } = req.body;
  const token = 'patSUWhqxJgIAx7aI.eb1afb50661d09401f6170231c2dc7f747c20a41374fe295ed4f4788600cfa71';
  const baseId = 'appYRmBdCEiuh1THx';
  const table = 'AccessCodes';
  if (!code || action !== 'validate') {
    return res.status(400).json({ error: 'Invalid request' });
  }
  try {
    const upperCode = code.trim().toUpperCase();
    const formula = `{Code}="${upperCode}"`;
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(formula)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    // DEBUG — return raw response
    return res.status(200).json({ debug: true, url, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
