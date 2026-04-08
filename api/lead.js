function escapeGraphQLString(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/"/g, '\\"');
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function formatText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  return Number.isFinite(num) ? num : '';
}

function addIfPresent(obj, key, value) {
  if (!key) return;
  if (value === '' || value === null || value === undefined) return;
  obj[key] = value;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const apiToken = requireEnv('MONDAY_API_KEY');
    const boardId = Number(requireEnv('MONDAY_BOARD_ID'));

    if (!Number.isFinite(boardId)) {
      throw new Error('MONDAY_BOARD_ID must be a valid number');
    }

    const payload = req.body || {};

    // This matches your CURRENT index.html payload structure
    const firstName = formatText(payload.firstName);
    const lastName = formatText(payload.lastName);
    const email = formatText(payload.email);
    const company = formatText(payload.company);
    const title = formatText(payload.title);
    const website = formatText(payload.companyWebsite);
    const teamName = formatText(payload.workgroupName);
    const startDate = formatText(payload.startDate);
    const endDate = formatText(payload.endDate);
    const currentTeamSize = formatNumber(payload.currentTeamSize);
    const avgHeadcount = formatNumber(payload.avgHeadcount);
    const turnoverRate = formatText(payload.turnoverRate);
    const retentionRate = formatText(payload.retentionRate);
    const attractCost = formatNumber(payload.attractCost);
    const assessCost = formatNumber(payload.assessCost);
    const addCost = formatNumber(payload.addCost);
    const impactCost = formatNumber(payload.impactCost);
    const totalCost = formatNumber(payload.totalCost);

    const itemName =
      `${firstName} ${lastName}`.trim() ||
      company ||
      'Bad Hire Calculator Submission';

    const columnValues = {};

    // These only get added if the env var exists
    addIfPresent(columnValues, process.env.MONDAY_COL_EMAIL, {
      email,
      text: email
    });
    addIfPresent(columnValues, process.env.MONDAY_COL_FIRST_NAME, firstName);
    addIfPresent(columnValues, process.env.MONDAY_COL_LAST_NAME, lastName);
    addIfPresent(columnValues, process.env.MONDAY_COL_TITLE, title);
    addIfPresent(columnValues, process.env.MONDAY_COL_COMPANY, company);
    addIfPresent(columnValues, process.env.MONDAY_COL_WEBSITE, website);
    addIfPresent(columnValues, process.env.MONDAY_COL_TEAM_NAME, teamName);
    addIfPresent(columnValues, process.env.MONDAY_COL_START_DATE, startDate);
    addIfPresent(columnValues, process.env.MONDAY_COL_END_DATE, endDate);
    addIfPresent(columnValues, process.env.MONDAY_COL_PLAYERS_CURRENT, currentTeamSize);
    addIfPresent(columnValues, process.env.MONDAY_COL_AVG_HEADCOUNT, avgHeadcount);
    addIfPresent(columnValues, process.env.MONDAY_COL_TURNOVER, turnoverRate);
    addIfPresent(columnValues, process.env.MONDAY_COL_RETENTION, retentionRate);
    addIfPresent(columnValues, process.env.MONDAY_COL_ATTRACT_TOTAL, attractCost);
    addIfPresent(columnValues, process.env.MONDAY_COL_ASSESS_TOTAL, assessCost);
    addIfPresent(columnValues, process.env.MONDAY_COL_ADD_TOTAL, addCost);
    addIfPresent(columnValues, process.env.MONDAY_COL_IMPACT_TOTAL, impactCost);
    addIfPresent(columnValues, process.env.MONDAY_COL_GRAND_TOTAL, totalCost);

    addIfPresent(columnValues, process.env.MONDAY_COL_RAW_JSON, JSON.stringify(payload));

    const query = `mutation {
      create_item(
        board_id: ${boardId},
        item_name: "${escapeGraphQLString(itemName)}",
        column_values: "${escapeGraphQLString(JSON.stringify(columnValues))}"
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
      console.error('Monday API full response:', JSON.stringify(data, null, 2));
      return res.status(500).json({
        success: false,
        error: data.errors?.[0]?.message || 'Monday API error',
        details: data.errors || data,
      });
    }

    return res.status(200).json({
      success: true,
      itemId: data.data?.create_item?.id || null,
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unexpected server error',
    });
  }
}
