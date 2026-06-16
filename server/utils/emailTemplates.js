function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function baseLayout(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NP Car Rental</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
          <tr>
            <td style="padding:36px 36px 0 36px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#1e293b">NP Car Rental</span>
                    <div style="width:32px;height:3px;background-color:#f59e0b;border-radius:2px;margin:8px auto 0"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:24px 36px;border-top:1px solid #e2e8f0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size:13px;color:#94a3b8;line-height:1.6">
                    <span style="font-weight:600;color:#64748b">NP Car Rental</span><br />
                    Peer-to-peer car rental marketplace<br />
                    <span style="color:#94a3b8">Need help? Contact us at</span>
                    <a href="mailto:support@npcarrental.com" style="color:#f59e0b;text-decoration:none;font-weight:500">support@npcarrental.com</a>
                    <div style="margin-top:12px;font-size:11px;color:#cbd5e1">
                      &copy; ${new Date().getFullYear()} NP Car Rental. All rights reserved.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href, text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto">
    <tr>
      <td align="center" style="border-radius:12px;background-color:#f59e0b;padding:0">
        <a href="${href}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#0f172a;text-decoration:none;border-radius:12px;letter-spacing:0.2px">${text}</a>
      </td>
    </tr>
  </table>`;
}

export function verificationEmail(fullName, link) {
  const safeFullName = escapeHtml(fullName);
  const safeLink = escapeHtml(link);
  const content = `
    <h1 style="margin:0 0 6px 0;font-size:20px;font-weight:700;color:#1e293b">Welcome to NP Car Rental</h1>
    <p style="margin:0 0 4px 0;font-size:15px;color:#475569;line-height:1.6">Hi ${safeFullName},</p>
    <p style="margin:0 0 4px 0;font-size:15px;color:#475569;line-height:1.6">Thanks for signing up! Please verify your email address to activate your account and start exploring cars.</p>
    ${button(safeLink, "Verify email address")}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:4px">
      <tr>
        <td style="font-size:13px;color:#94a3b8;line-height:1.6">
          <p style="margin:0">Or paste this link in your browser:</p>
          <p style="margin:4px 0 0 0;word-break:break-all"><a href="${safeLink}" style="color:#64748b;text-decoration:underline">${safeLink}</a></p>
          <p style="margin:12px 0 0 0;padding:10px 14px;background-color:#fffbeb;border-radius:8px;color:#b45309;font-weight:500">This link expires in 24 hours.</p>
        </td>
      </tr>
    </table>
  `;
  return baseLayout(content);
}
