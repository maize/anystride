import { NextApiRequest, NextApiResponse } from "next";
import { parse } from 'node-html-parser';

const NYRR_URL = 'https://www.nyrr.org/api/feature/volunteer/FilterVolunteerOpportunities?available_only=true&itemId=3EB6F0CC-0D76-4BAF-A894-E2AB244CEB44&limit=100&offset=0&opportunity_type=9%2B1%20Qualifier&totalItemLoaded=100';
const SCRAPING_BEE_API_URL = 'https://app.scrapingbee.com/api/v1?';

export default async function GET(
  _: NextApiRequest,
  res: NextApiResponse,
) {
  if (!process.env.SCRAPING_BEE_API_KEY) {
    return res.status(500).json({
      message: 'Missing SCRAPING_BEE_API_KEY environment variable',
    })
  }

  const request = await fetch(
    SCRAPING_BEE_API_URL + new URLSearchParams({
      api_key: process.env.SCRAPING_BEE_API_KEY as string,
      url: NYRR_URL,
    }),
  );

  const json = await request.json();

  if (json.html) {
    const root = parse(json.html);
    const roles = root.querySelectorAll('section.role_listing');

    const availableRoles = [];

    for (const role of roles) {
      const isMedical = role.querySelector('.medical_icon');
      const isFreeRun = role.querySelector('.tag.tag--no');
      if (!isMedical && !isFreeRun) {
        const title = role.querySelector('.role_listing__title')?.textContent.trim();
        const event = role.querySelector('.role_listing__event')?.textContent.trim();

        availableRoles.push({
          title,
          event,
        });
      };
    }

    if (availableRoles.length > 0) {
      return res.json({
        roles: availableRoles,
      });
    } else {
      return res.json({
        message: "No volunteering roles available",
      });   
    }
  }

  return res.status(404);
}