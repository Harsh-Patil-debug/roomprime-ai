const env = import.meta.env;

export async function sendWelcomeEmail(email: string, name: string) {
  const resendApiKey = env["VITE_RESEND_API_KEY"];

  if (!resendApiKey || resendApiKey.includes("PLACEHOLDER")) {
    console.log(`\n======================================================`);
    console.log(`[EMAIL SIMULATION] Sending Welcome Email:`);
    console.log(`To: ${email}`);
    console.log(`Subject: Welcome to RoomFlow Operations! 🏨`);
    console.log(`Body: Hi ${name}, welcome to your hotel housekeeping command center!`);
    console.log(`To receive real emails, configure VITE_RESEND_API_KEY in .env.`);
    console.log(`======================================================\n`);
    return { simulated: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "RoomFlow Onboarding <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to RoomFlow Operations! 🏨",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #D2D2BC; border-radius: 16px; background-color: #ECECDC; color: #09332C;">
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="display: inline-block; padding: 12px; background-color: #09332C; border-radius: 12px; color: #ECECDC; font-weight: bold; font-size: 20px;">
                🏨 RoomFlow
              </span>
            </div>
            
            <h1 style="color: #09332C; font-size: 22px; margin-bottom: 15px; font-weight: bold; text-align: center;">
              Welcome to RoomFlow, ${name}!
            </h1>
            
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
              Your account has been successfully created and linked to your Gmail: <strong>${email}</strong>.
            </p>
            
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              RoomFlow is a high-speed, luxury hotel operational manager. You now have complete access to housekeeping schedules, task checklists, and live developer console logs.
            </p>
            
            <div style="margin: 25px 0; padding: 20px; background-color: #FFFFFF; border: 1px solid #D2D2BC; border-radius: 10px;">
              <strong style="color: #09332C; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                Operations Command Center Access
              </strong>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #5C6E6A; line-height: 1.8;">
                <li><strong>Control Center</strong>: Edit room states (Vacant ➔ Cleaning ➔ Ready).</li>
                <li><strong>Request Queue</strong>: Monitor guest requests with automated SLA stopwatch timers.</li>
                <li><strong>Staff Portal</strong>: Housekeeper mobile-friendly tasks and visual QA checks.</li>
                <li><strong>Developer API Console</strong>: Test API payloads and sandbox settings.</li>
              </ul>
            </div>
            
            <p style="font-size: 13px; line-height: 1.6; margin-bottom: 25px;">
              If you have any questions or require training materials, please reach out to your hotel operations supervisor.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #D2D2BC; margin-bottom: 20px;" />
            
            <p style="color: #5C6E6A; font-size: 11px; text-align: center; margin: 0;">
              RoomFlow Operations Suite • Grand Palace Hotel Group
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Resend API response error (${response.status}): ${errText}`);
    }

    return await response.json();
  } catch (e: any) {
    console.error("sendWelcomeEmail API failure: ", e);
    throw e;
  }
}
