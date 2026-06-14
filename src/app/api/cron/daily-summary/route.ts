import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { getPricingConfigRows, formatModelDisplay, VEHICLE_MODELS } from "@/lib/models";

export async function GET(request: Request) {
  try {
    // 1. Enforce authentication in production
    const authHeader = request.headers.get("Authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Resolve Resend configuration
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "Resend API key is not configured" }, { status: 500 });
    }

    // 3. Calculate Month-To-Date (MTD) start date in IST timezone
    // IST is UTC+5:30. Let's find the current month start in IST.
    const now = new Date();
    const indiaTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const currentYear = indiaTime.getUTCFullYear();
    const currentMonth = indiaTime.getUTCMonth(); // 0-indexed

    // Start of the month in IST (June 1st 00:00:00 IST = UTC May 31st 18:30:00)
    const startOfMonthIST = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
    const startOfMonthUTC = new Date(startOfMonthIST.getTime() - 5.5 * 60 * 60 * 1000);

    // 4. Query all APPROVED sales reports since the start of the month
    const sales = await prisma.saleReport.findMany({
      where: {
        createdAt: {
          gte: startOfMonthUTC,
        },
        status: "APPROVED",
      },
      include: {
        branch: true,
      },
    });

    // 5. Aggregate branch-wise and model-wise breakdown
    const branchBreakdown: { [branchName: string]: number } = {};
    
    const pricingRows = getPricingConfigRows();
    const modelBreakdown: { [displayName: string]: number } = {};
    pricingRows.forEach((row) => {
      const displayName = formatModelDisplay(row.modelName, row.modelVariant);
      modelBreakdown[displayName] = 0;
    });

    sales.forEach((sale) => {
      const bName = sale.branch.name;
      branchBreakdown[bName] = (branchBreakdown[bName] || 0) + 1;

      const modelConfig = VEHICLE_MODELS.find(m => m.name === sale.modelName);
      let displayName = sale.modelName;
      if (modelConfig && modelConfig.variantLabel !== "Colour" && sale.modelVariant) {
        displayName = formatModelDisplay(sale.modelName, sale.modelVariant);
      }

      modelBreakdown[displayName] = (modelBreakdown[displayName] || 0) + 1;
    });

    // 6. Send summary report email via Resend
    const resend = new Resend(resendApiKey);
    const dateFormatted = indiaTime.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const monthName = indiaTime.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    await resend.emails.send({
      from: "Dealership Hub <onboarding@resend.dev>",
      to: "mlgbajaj@gmail.com",
      subject: `Daily MTD Sales Summary - ${dateFormatted}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #1e40af, #1e3a8a); color: white; padding: 24px; text-align: center;">
            <p style="text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em; font-weight: 600; color: #93c5fd; margin: 0;">Vishnu Priya Automotives</p>
            <h2 style="margin: 8px 0 0 0; font-size: 22px;">Daily MTD Sales Summary</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #bfdbfe;">Month-To-Date Report: ${monthName}</p>
          </div>
          
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
              <span style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 4px;">Total Vehicles Sold (MTD)</span>
              <span style="font-size: 32px; font-weight: bold; color: #1e3a8a;">${sales.length}</span>
            </div>

            <h3 style="color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 0; margin-bottom: 12px;">Branch-wise Performance Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 8px 12px; font-weight: 600; color: #475569;">Branch Location</th>
                  <th style="padding: 8px 12px; font-weight: 600; color: #475569; text-align: right;">Vehicles Sold (MTD)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(branchBreakdown)
                  .map(
                    ([bName, count]) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 12px; color: #334155; font-weight: 500;">${bName}</td>
                    <td style="padding: 10px 12px; color: #1e3a8a; font-weight: bold; text-align: right;">${count}</td>
                  </tr>
                `
                  )
                  .join("")}
                ${
                  Object.keys(branchBreakdown).length === 0
                    ? `
                  <tr>
                    <td colspan="2" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic;">No sales recorded this month yet.</td>
                  </tr>
                `
                    : ""
                }
              </tbody>
            </table>

            <h3 style="color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 0; margin-bottom: 12px;">Model-wise Performance Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 8px 12px; font-weight: 600; color: #475569;">Vehicle Model</th>
                  <th style="padding: 8px 12px; font-weight: 600; color: #475569; text-align: right;">Vehicles Sold (MTD)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(modelBreakdown)
                  .filter(([_, count]) => count > 0)
                  .map(
                    ([mName, count]) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 12px; color: #334155; font-weight: 500;">${mName}</td>
                    <td style="padding: 10px 12px; color: #1e3a8a; font-weight: bold; text-align: right;">${count}</td>
                  </tr>
                `
                  )
                  .join("")}
                ${
                  Object.values(modelBreakdown).every((count) => count === 0)
                    ? `
                  <tr>
                    <td colspan="2" style="padding: 16px; text-align: center; color: #94a3b8; font-style: italic;">No models sold this month.</td>
                  </tr>
                `
                    : ""
                }
              </tbody>
            </table>
          </div>

          <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
            This report was auto-generated on ${dateFormatted} at 10:00 PM IST.
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, count: sales.length });
  } catch (error: any) {
    console.error("Daily Summary Cron Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during the daily summary cron job" },
      { status: 500 }
    );
  }
}
