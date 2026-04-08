function escapeGraphQLString(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/"/g, '\\"');
}

function getEnv(name) {
  return process.env[name];
}

function requireAnyEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing required environment variable. Expected one of: ${names.join(', ')}`);
}

function formatValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

function formatNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function addColumnIfPresent(obj, columnId, value) {
  if (!columnId || columnId === 'undefined') return;
  obj[columnId] = value;
}

function buildColumnValues(payload) {
  const columnValues = {};

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_EMAIL'),
    {
      email: formatValue(payload.contact?.email),
      text: formatValue(payload.contact?.email),
    }
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_FIRST_NAME'),
    formatValue(payload.contact?.first_name)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_LAST_NAME'),
    formatValue(payload.contact?.last_name)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_TITLE'),
    formatValue(payload.contact?.title)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_COMPANY'),
    formatValue(payload.contact?.company_name)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_WEBSITE'),
    formatValue(payload.contact?.company_website)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_TEAM_NAME'),
    formatValue(payload.contact?.team_name)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_START_DATE'),
    formatValue(payload.report_parameters?.start_date)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_END_DATE'),
    formatValue(payload.report_parameters?.end_date)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_PLAYERS_START'),
    formatNumber(payload.report_parameters?.players_start)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_PLAYERS_HIRED'),
    formatNumber(payload.report_parameters?.players_hired)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_PLAYERS_LEFT'),
    formatNumber(payload.report_parameters?.players_left)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_PLAYERS_CURRENT'),
    formatNumber(payload.report_parameters?.players_current)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_AVG_HEADCOUNT'),
    formatNumber(payload.report_parameters?.avg_headcount)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_TURNOVER'),
    formatValue(payload.report_parameters?.turnover_rate)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_RETENTION'),
    formatValue(payload.report_parameters?.retention_rate)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_CURRENCY'),
    formatValue(payload.totals?.currency)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_ATTRACT_TOTAL'),
    formatNumber(payload.totals?.attract)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_ASSESS_TOTAL'),
    formatNumber(payload.totals?.assess)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_ADD_TOTAL'),
    formatNumber(payload.totals?.add)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_IMPACT_TOTAL'),
    formatNumber(payload.totals?.impact)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_GRAND_TOTAL'),
    formatNumber(payload.totals?.grand_total)
  );

  addColumnIfPresent(
    columnValues,
    getEnv('MONDAY_COL_RAW_JSON'),
    JSON.stringify(payload)
  );

  return columnValues;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiToken = requireAnyEnv(['MONDAY_API_KEY', 'MONDAY_API_TOKEN']);
    const boardIdRaw = requireAnyEnv(['MONDAY_BOARD_ID']);
    const boardId = Number(boardIdRaw);

    if (!Number.isFinite(boardId)) {
      throw new Error('MONDAY_BOARD_ID must be a valid number');
    }

    const payload = req.body || {};

    const firstName = formatValue(payload.contact?.first_name);
    const lastName = formatValue(payload.contact?.last_name);
    const company = formatValue(payload.contact?.company_name);

    const itemName =
      `${firstName} ${lastName}`.trim() ||
      company ||
      'Bad Hire Calculator Submission';

    const columnValuesObject = buildColumnValues(payload);
    const columnValuesJson = JSON.stringify(columnValuesObject);

    const query = `mutation {
      create_item(
        board_id: ${boardId},
        item_name: "${escapeGraphQLString(itemName)}",
        column_values: "${escapeGraphQLString(columnValuesJson)}"
      ) {
        id
      }
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
      console.error('Monday API error:', JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: data.errors?.[0]?.message || 'Monday API error',
        details: data.errors || data,
      });
    }

    return res.status(200).json({
      ok: true,
      itemId: data.data?.create_item?.id || null,
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: error.message || 'Unexpected server error',
    });
  }
}
