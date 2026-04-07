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
    } = req.body || {};

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
      numeric_mm26t93n: retentionRate === "" ? null : Number(retentionRate),
      numeric_mm264rze: turnoverRate === "" ? null : Number(turnoverRate),
      numeric_mm268na4: avgHeadcount === "" ? null : Number(avgHeadcount),
      numeric_mm26hnaq: currentTeamSize === "" ? null : Number(currentTeamSize),
      date_mm26bha6: endDate || null,
      numeric_mm268267: totalCost === "" ? null : Number(totalCost),
      numeric_mm2671wm: attractCost === "" ? null : Number(attractCost),
      numeric_mm26aw7e: assessCost === "" ? null : Number(assessCost),
      numeric_mm26x4ah: addCost === "" ? null : Number(addCost),
      numeric_mm262n6w: impactCost === "" ? null : Number(impactCost),
      date_mm26pcfr: startDate || null,
      text_mm26qasb: companyWebsite,
      text_mm266pdn: workgroupName
    };

    Object.keys(columnValues).forEach((key) => {
      if (columnValues[key] === null) delete columnValues[key];
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

    const data = await response.json();

    if (!response.ok || data.errors) {
      return res.status(500).json({
        message: "Monday API error",
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      itemId: data.data.create_item.id
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
}
