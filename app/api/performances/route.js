import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format. Expected an array." }, { status: 400 });
    }
    const filePath = path.resolve(process.cwd(), "public/data/performances.json");
    await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
