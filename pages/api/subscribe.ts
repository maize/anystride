import { NextApiRequest, NextApiResponse } from "next"

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    message: string,
  }>
) {
  const body = req.body

  console.log('body: ', body)

  if (!body.email) {
    return res.status(400).json({ message: 'Email not found' })
  }

  return res.status(200).json({ message: body.email })
}