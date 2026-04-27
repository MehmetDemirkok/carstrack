export function getResetPasswordHtml(resetLink: string): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>CarsTrack — Şifre Sıfırlama</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">

          <!-- Header gradient bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#7c3aed,#a855f7,#6366f1);"></td>
          </tr>

          <!-- Logo area -->
          <tr>
            <td align="center" style="padding:36px 40px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);border-radius:14px;padding:14px 16px;margin-bottom:14px;">
                      <span style="font-size:28px;line-height:1;">&#x1F697;</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:26px;font-weight:800;color:#fafafa;letter-spacing:-0.5px;">CarsTrack</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#71717a;font-weight:500;letter-spacing:0.5px;">FİLO YÖNETİM SİSTEMİ</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#27272a;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fafafa;">Şifre Sıfırlama</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">
                Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${resetLink}" target="_blank"
                       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                      Şifremi Sıfırla &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#27272a;border-radius:10px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                      <strong style="color:#a1a1aa;">&#x26A0;&#xFE0F; Güvenlik notu:</strong>
                      Bu bağlantı 1 saat içinde geçerliliğini yitirecektir. Eğer bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz — şifreniz değiştirilmeyecektir.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:24px 0 0;font-size:11px;color:#52525b;line-height:1.6;">
                Buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcınıza kopyalayın:<br/>
                <a href="${resetLink}" target="_blank" style="color:#7c3aed;word-break:break-all;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="height:1px;background-color:#27272a;margin-bottom:20px;"></div>
              <p style="margin:0;font-size:11px;color:#52525b;text-align:center;line-height:1.5;">
                &copy; ${year} CarsTrack. Tüm hakları saklıdır.<br/>
                Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
