export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const apiKey = process.env.MONDAY_API_KEY;
  const boardId = 18406338529;

  if (!apiKey) {
    return res.status(500).json({ message: "Missing MONDAY_API_KEY" });
  }

  try {
    const data = req.body || {};

    const {
      firstName = "",
      lastName = "",
      email = "",
      phone = "",
      company = "",
      title = "",
      workgroupName = "",
      companyWebsite = "",
      startDate = "",
      endDate = "",
      currentTeamSize = "",
      avgHeadcount = "",
      turnoverRate = "",
      retentionRate = "",
      totalCost = "",
      attractCost = "",
      assessCost = "",
      addCost = "",
      impactCost = ""
    } = data;

    const itemName =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      company ||
      "Bad Hire Calculator Submission";

    const columnValues = {
      lead_status: { label: "New Lead" },
      lead_company: company,
      text: title,
      lead_email: email ? { email, text: email } : null,
      lead_phone: phone ? { phone, countryShortName: "US" } : null,
      color_mkyb8krc: { labels: ["Calculator"] },

      text_mm26abnx: firstName,
      text_mm26dvcp: lastName,
      text_mm266pdn: workgroupName,
      text_mm26qasb: companyWebsite,

      numeric_mm26hnaq: currentTeamSize ? Number(currentTeamSize) : null,
      numeric_mm268na4: avgHeadcount ? Number(avgHeadcount) : null,
      numeric_mm264rze: turnoverRate ? Number(turnoverRate) : null,
      numeric_mm26t93n: retentionRate ? Number(retentionRate) : null,

      numeric_mm268267: totalCost ? Number(totalCost) : null,
      numeric_mm2671wm: attractCost ? Number(attractCost) : null,
      numeric_mm26aw7e: assessCost ? Number(assessCost) : null,
      numeric_mm26x4ah: addCost ? Number(addCost) : null,
      numeric_mm262n6w: impactCost ? Number(impactCost) : null,

      date_mm26pcfr: startDate || null,
      date_mm26bha6: endDate || null
    };

    // remove null values
    Object.keys(columnValues).forEach((key) => {
      if (columnValues[key] === null || columnValues[key] === "") {
        delete columnValues[key];
      }
    });

    const query = `
      mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables: {
          boardId,
          itemName,
          columnValues: JSON.stringify(columnValues)
        }
      })
    });

    const result = await response.json();

    if (!response.ok || result.errors) {
      return res.status(500).json({
        message: "Monday API error",
        details: result
      });
    }

    return res.status(200).json({
      success: true,
      itemId: result.data.create_item.id
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
}
