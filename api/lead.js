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

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function addIfPresent(obj, key, value) {
  if (value === null || value === undefined || value === '') return;
  obj[key] = value;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const apiToken = requireEnv('MONDAY_API_KEY');
    const boardId = Number(requireEnv('MONDAY_BOARD_ID'));

    if (!Number.isFinite(boardId)) {
      throw new Error('MONDAY_BOARD_ID must be a valid number');
    }

    const payload = req.body || {};

    // Matches your CURRENT index.html payload
    const firstName = cleanText(payload.firstName);
    const lastName = cleanText(payload.lastName);
    const email = cleanText(payload.email);
    const company = cleanText(payload.company);
    const title = cleanText(payload.title);
    const companyWebsite = cleanText(payload.companyWebsite);
    const workgroupName = cleanText(payload.workgroupName);

    const startDate = cleanText(payload.startDate);
    const endDate = cleanText(payload.endDate);

    const currentTeamSize = cleanNumber(payload.currentTeamSize);
    const avgHeadcount = cleanNumber(payload.avgHeadcount);
    const turnoverRate = cleanNumber(payload.turnoverRate);
    const retentionRate = cleanNumber(payload.retentionRate);

    const attractCost = cleanNumber(payload.attractCost);
    const assessCost = cleanNumber(payload.assessCost);
    const addCost = cleanNumber(payload.addCost);
    const impactCost = cleanNumber(payload.impactCost);
    const totalCost = cleanNumber(payload.totalCost);

    const itemName =
      `${firstName} ${lastName}`.trim() ||
      company ||
      email ||
      'Bad Hire Calculator Submission';

    // Hardcoded to the REAL Monday column IDs you provided
    const columnValues = {};

    addIfPresent(columnValues, 'lead_email', email ? { email, text: email } : null);
    addIfPresent(columnValues, 'lead_company', company);
    addIfPresent(columnValues, 'text', title);

    addIfPresent(columnValues, 'text_mm26abnx', firstName);
    addIfPresent(columnValues, 'text_mm26dvcp', lastName);
    addIfPresent(columnValues, 'text_mm26qasb', companyWebsite);
    addIfPresent(columnValues, 'text_mm266pdn', workgroupName);

    addIfPresent(columnValues, 'numeric_mm26hnaq', currentTeamSize);
    addIfPresent(columnValues, 'numeric_mm268na4', avgHeadcount);
    addIfPresent(columnValues, 'numeric_mm264rze', turnoverRate);
    addIfPresent(columnValues, 'numeric_mm26t93n', retentionRate);

    addIfPresent(columnValues, 'numeric_mm2671wm', attractCost);
    addIfPresent(columnValues, 'numeric_mm26aw7e', assessCost);
    addIfPresent(columnValues, 'numeric_mm26x4ah', addCost);
    addIfPresent(columnValues, 'numeric_mm262n6w', impactCost);
    addIfPresent(columnValues, 'numeric_mm268267', totalCost);

    // Monday date columns should be sent as objects
    addIfPresent(columnValues, 'date_mm26pcfr', startDate ? { date: startDate } : null);
    addIfPresent(columnValues, 'date_mm26bha6', endDate ? { date: endDate } : null);

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
      console.error('Column values sent:', JSON.stringify(columnValues, null, 2));

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
