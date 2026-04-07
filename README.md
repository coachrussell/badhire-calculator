# Bad Hire Calculator - Vercel package

## Included
- `index.html` - calculator UI
- `api/lead.js` - Vercel serverless function that sends submissions to monday.com
- `.env.example` - required environment variables
- `vercel.json` - basic Vercel config

## What changed
- Added a **Send Results** button below **Print Report**
- Button validates key lead fields and posts calculator data to `/api/lead`
- API route creates a new item in monday.com

## What you still need from Monday
1. API token
2. Board ID
3. Column IDs for the board

## Suggested Monday columns
- Email
- First Name
- Last Name
- Title
- Company
- Website
- Team Name
- Start Date
- End Date
- Players Start
- Players Hired
- Players Left
- Players Current
- Avg Headcount
- Turnover
- Retention
- Currency
- Attract Total
- Assess Total
- Add Total
- Impact Total
- Grand Total
- Raw JSON

## Deploy to Vercel
1. Create a new Vercel project
2. Upload this whole folder
3. In Vercel project settings, add the environment variables from `.env.example`
4. Redeploy

## Squarespace embed
Use an iframe pointing to the Vercel URL.
