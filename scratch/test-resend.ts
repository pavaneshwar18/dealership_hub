import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.error("No RESEND_API_KEY found");
  process.exit(1);
}

const resend = new Resend(resendApiKey);

async function testEmail() {
  console.log("Sending email to mlgbajaj@gmail.com...");
  const { data, error } = await resend.emails.send({
    from: "Dealership Hub <onboarding@resend.dev>",
    to: "mlgbajaj@gmail.com",
    subject: "Resend Test",
    html: "<p>Testing Resend API</p>",
  });

  if (error) {
    console.error("Resend Error:", error);
  } else {
    console.log("Success:", data);
  }
}

testEmail();
