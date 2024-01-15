import { NextApiRequest, NextApiResponse } from "next"
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    message: string,
  }>
) {
  const body = req.body

  if (!body.email) {
    return res.status(400).json({ message: 'Email not found' })
  }

  console.info(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data } = await client.from('emails').insert({
    email: body.email,
  });

  console.info(data);

  return res.status(200).json({ message: body.email })
}