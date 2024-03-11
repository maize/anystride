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

  const { error, status } = await client.from('emails').insert({
    email: body.email,
  });

  if (error) return res.status(status).json({
    message: error.message,
  });

  return res.status(status).json({
    message: 'Email added to list'
  });
}