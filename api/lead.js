function escapeGraphQLString(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/"/g, '\\"');
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

function buildColumnValues(payload) {
  const map = {
    [process.env.MONDAY_COL_EMAIL]: { email: formatValue(payload.contact?.email), text: formatValue(payload.contact?.email) },
    [process.env.MONDAY_COL_FIRST_NAME]: formatValue(payload.contact?.first_name),
    [process.env.MONDAY_COL_LAST_NAME]: formatValue(payload.contact?.last_name),
    [process.env.MONDAY_COL_TITLE]: formatValue(payload.contact?.title),
    [process.env.MONDAY_COL_COMPANY]: formatValue(payload.contact?.company_name),
    [process.env.MONDAY_COL_WEBSITE]: formatValue(payload.contact?.company_website),
    [process.env.MONDAY_COL_TEAM_NAME]: formatValue(payload.contact?.team_name),
    [process.env.MONDAY_COL_START_DATE]: formatValue(payload.report_parameters?.start_date),
    [process.env.MONDAY_COL_END_DATE]: formatValue(payload.report_parameters?.end_date),
    [process.env.MONDAY_COL_PLAYERS_START]: Number(payload.report_parameters?.players_start || 0),
    [process.env.MONDAY_COL_PLAYERS_HIRED]: Number(payload.report_parameters?.players_hired || 0),
    [process.env.MONDAY_COL_PLAYERS_LEFT]: Number(payload.report_parameters?.players_left || 0),
    [process.env.MONDAY_COL_PLAYERS_CURRENT]: Number(payload.report_parameters?.players_current || 0),
    [process.env.MONDAY_COL_AVG_HEADCOUNT]: Number(payload.report_parameters?.avg_headcount || 0),
    [process.env.MONDAY_COL_TURNOVER]: formatValue(payload.report_parameters?.turnover_rate),
    [process.env.MONDAY_COL_RETENTION]: formatValue(payload.report_parameters?.retention_rate),
    [process.env.MONDAY_COL_CURRENCY]: formatValue(payload.totals?.currency),
    [process.env.MONDAY_COL_ATTRACT_TOTAL]: Number(payload.totals?.attract || 0),
    [process.env.MONDAY_COL_ASSESS_TOTAL]: Number(payload.totals?.assess || 0),
    [process.env.MONDAY_COL_ADD_TOTAL]: Number(payload.totals?.add || 0),
    [process.env.MONDAY_COL_IMPACT_TOTAL]: Number(payload.totals?.impact || 0),
    [process.env.MONDAY_COL_GRAND_TOTAL]: Number(payload.totals?.grand_total || 0),
    [process.env.MONDAY_COL_RAW_JSON]: JSON.stringify(payload),
  };

  return Object.fromEntries(
    Object.entries(map).filter(([key]) => key && key !== 'undefined')
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiToken = requireEnv('MONDAY_API_TOKEN');
    const boardId = Number(requireEnv('MONDAY_BOARD_ID'));

    const payload = req.body || {};
    const firstName = formatValue(payload.contact?.first_name);
    const lastName = formatValue(payload.contact?.last_name);
    const company = formatValue(payload.contact?.company_name);
    const itemName = `${firstName} ${lastName}`.trim() || company || 'Bad Hire Calculator Submission';

    const columnValues = JSON.stringify(buildColumnValues(payload));
    const query = `mutation {
      create_item(
        board_id: ${boardId},
        item_name: "${escapeGraphQLString(itemName)}",
        column_values: "${escapeGraphQLString(columnValues)}"
      ) { id }
    }`;

    const mondayRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken,
      },
      body: JSON.stringify({ query }),
    });

    const data = await mondayRes.json();
    if (!mondayRes.ok || data.errors) {
      return res.status(500).json({ error: data.errors?.[0]?.message || 'Monday API error', details: data.errors || data });
    }

    return res.status(200).json({ ok: true, itemId: data.data?.create_item?.id || null });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected server error' });
  }
}
