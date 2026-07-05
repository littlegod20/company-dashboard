import { NextRequest, NextResponse } from "next/server";

// TODO: implement file upload, Excel parsing, and pipeline ingestion
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: "Upload endpoint not yet implemented" },
    { status: 501 }
  );
}
