export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured()) {
    const error = new Error("Email verification and password recovery are temporarily unavailable. Please try again later.");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend email error:", response.status, detail);
    throw new Error("Unable to send email at this time");
  }
  return response.json();
}
