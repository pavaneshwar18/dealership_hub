import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    // 1. Enforce authentication (Admin only)
    await requireAdmin();

    // 2. Check Gemini API Key configuration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured in your environment variables. Please add GEMINI_API_KEY to your .env file." },
        { status: 400 }
      );
    }

    // 3. Extract uploaded file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No file was uploaded." },
        { status: 400 }
      );
    }

    // 4. Validate file type
    const validMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, PNG, or JPEG file." },
        { status: 400 }
      );
    }

    // 5. Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // 6. Initialize Gemini Client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We use gemini-1.5-flash as it is extremely fast and cost-effective (free) for document extraction
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              chassisNumber: { type: SchemaType.STRING },
              engineNumber: { type: SchemaType.STRING },
              modelName: { type: SchemaType.STRING },
              modelVariant: { type: SchemaType.STRING },
            },
            required: ["chassisNumber", "engineNumber", "modelName"],
          },
        },
      },
    });

    const prompt = `
      You are an expert document data extractor. Analyze the uploaded invoice, which lists new vehicles ordered/received for our dealership.
      Extract each vehicle's Chassis Number (sometimes labeled Chassis No, Frame No, Vin, or Chassis), Engine Number (sometimes Engine No, Motor No, or Engine), and the Vehicle Model/Variant.

      Follow these guidelines to map the modelName and modelVariant:
      - Map the modelName to the closest matching dealership model from this list:
        * Compact Diesel
        * Maxima Z Diesel
        * Maxima WB Diesel
        * 4S LPG
        * Cargo Diesel
        * RE CNG
        * Maxima Z (CNG)
        * Maxima WB (CNG)
        * Cargo CNG
        * Wego
      
      - Map modelVariant if a specific colour or model code is mentioned. For example:
        * For Maxima Z (CNG), Maxima WB (CNG), or Cargo CNG, the variant is typically a color like "G.Yellow" or "E.Green".
        * For Wego, the variant is typically a code like "P5009", "P5012", "P7012", "P9018", or "C9012".
        * If no variant exists, omit or return null.

      Return a JSON array of objects.
    `;

    // 7. Call Gemini API
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const rawResponse = result.response.text();
    const parsedData = JSON.parse(rawResponse);

    return NextResponse.json({ vehicles: parsedData });
  } catch (error: any) {
    console.error("Gemini Ingestion Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while parsing the invoice." },
      { status: 500 }
    );
  }
}
