import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_CHATBOT_API_URL;
const API_AUTH = process.env.CHATBOT_API_AUTH;

if (!API_URL || !API_AUTH) {
  throw new Error("Missing API credentials. Ensure NEXT_PUBLIC_CHATBOT_API_URL and CHATBOT_API_AUTH are set in .env.local.");
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const response = await fetch(API_URL as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${API_AUTH}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch response from chatbot API" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ response: data.response });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
