import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = await fetch("https://id.twitch.tv/oauth2/validate", {
      method: "GET",
      headers: {
        Authorization: `${
          req.cookies.Authorization ?? req.cookies.Authorization
        }`,
      },
    }).then((res) => res.json());
    res.status(200).json(data);
  } catch (error: any) {
    console.error(error);
    return res.status(error.status || 500).end(error.message);
  }
}
