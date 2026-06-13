import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // Optional: Add WEBHOOK_SECRET to .env to secure this endpoint from unauthorized access
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sender, subject, text, html } = body;

    const emailContent = text || html;

    if (!subject || !emailContent) {
      return NextResponse.json({ error: "Missing subject or email content in payload" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We use gemini-2.5-flash as it is fast and supports JSON Schema natively
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            customerName: {
              type: SchemaType.STRING,
              description: "The name of the customer extracted from the email subject or body. Remove salutations like Mr. or Mrs.",
            },
            insuranceProvider: {
              type: SchemaType.STRING,
              description: "The name of the insurance provider. Usually 'ICICI Lombard' or 'Future Generali' based on the sender or email context.",
            },
            policyNumber: {
              type: SchemaType.STRING,
              description: "The exact extracted policy number.",
            },
          },
          required: ["customerName", "insuranceProvider", "policyNumber"],
        },
      },
    });

    const prompt = `
      You are an AI assistant parsing insurance emails. 
      Extract the customer name, insurance provider, and policy number from the following email.
      
      Sender: ${sender || "Unknown"}
      Subject: ${subject}
      Body:
      ${emailContent}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response", responseText);
      return NextResponse.json({ error: "AI response parsing failed" }, { status: 500 });
    }

    const { customerName, insuranceProvider, policyNumber } = parsedData;

    if (!customerName || !policyNumber) {
      return NextResponse.json({ error: "AI failed to extract required fields", extracted: parsedData }, { status: 422 });
    }

    // Search for a matching SaleReport that needs insurance.
    // We look at the last 100 approved sales to avoid scanning the entire database.
    const recentSales = await prisma.saleReport.findMany({
      where: {
        status: "APPROVED",
        insuranceCompleted: false,
      },
      orderBy: { createdAt: "desc" },
      take: 100, 
    });

    // Flexible matching: check if the parsed name is included in the customerName or vice versa (case-insensitive)
    const matchedSale = recentSales.find(sale => {
      const saleName = sale.customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const parsedName = customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check for partial matches to account for missing surnames or slight variations
      return saleName.includes(parsedName) || parsedName.includes(saleName);
    });

    if (!matchedSale) {
      return NextResponse.json({ 
        message: "Parsed successfully but no matching pending sale found for the customer.",
        extracted: parsedData
      }, { status: 404 });
    }

    // Update the database
    await prisma.saleReport.update({
      where: { id: matchedSale.id },
      data: {
        insuranceCompleted: true,
        insuranceProvider: insuranceProvider || "Unknown Provider",
        insurancePolicyNumber: policyNumber,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Insurance updated successfully",
      saleId: matchedSale.id,
      extracted: parsedData
    });

  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
