import { NextApiRequest, NextApiResponse } from "next"
import { createSupabaseClient } from "../../app/utils/cient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    message: string,
  }>
) {
  const body = req.body

  if (!body.email) return res.status(400).json({
    message: 'Email is missing'
  });

  const client = createSupabaseClient();

  const { status } = await client.from('emails').insert({
    email: body.email,
  });

  return res.status(status);
}