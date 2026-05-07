export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { formData, briefText, mode } = body;

    if (!formData || !formData.clientName || !formData.clientEmail || !formData.companyName) {
      return json({ error: 'Missing required fields' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.clientEmail)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    // Save to D1
    const result = await env.DB.prepare(
      `INSERT INTO submissions (mode, client_name, client_email, company_name, data, brief_text, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      mode || 'general',
      formData.clientName,
      formData.clientEmail,
      formData.companyName,
      JSON.stringify(formData),
      briefText || '',
      request.headers.get('CF-Connecting-IP') || '',
      request.headers.get('User-Agent') || ''
    ).run();

    // Send admin notification
    const adminEmailPromise = sendAdminEmail(formData, briefText, mode, env, request);

    // Send client confirmation
    const clientEmailPromise = sendClientEmail(formData, mode, env);

    // Fire emails without blocking response
    await Promise.allSettled([adminEmailPromise, clientEmailPromise]);

    return json({ success: true, id: result.meta.last_row_id }, 201);

  } catch (error) {
    console.error('Submission error:', error);
    return json({ error: 'Failed to save submission' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ── Admin Notification Email ──
async function sendAdminEmail(data, briefText, mode, env, request) {
  const to = env.CONTACT_EMAIL || 'konanandspade@gmail.com';
  const from = `Konan & Spade <${env.FROM_EMAIL || 'noreply@konanspade.com'}>`;
  const modeLabel = mode === 'lawfirm' ? 'Law Firm' : 'General';
  const subject = `New Brand Brief: ${data.companyName} (${modeLabel})`;

  const traits = Array.isArray(data.traits) ? data.traits.join(', ') : (data.traits || '-');
  const styles = Array.isArray(data.visualStyles) ? data.visualStyles.join(', ') : (data.visualStyles || '-');
  const colors = Array.isArray(data.colorsLove) ? data.colorsLove.join(', ') : (data.colorsLove || '-');
  const audience = data.targetAudience || data.idealClients || '-';
  const competitors = data.competitors || '-';
  const existingBrand = data.existingBrand || data.websiteUrl || '-';
  const additionalNotes = data.anythingElse || data.additionalNotes || '-';

  const lawFirmRows = mode === 'lawfirm' ? `
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Practice Areas</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(Array.isArray(data.practiceAreas) ? data.practiceAreas.join(', ') : (data.practiceAreas || '-'))}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Firm Size</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(data.firmSize || '-')}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Jurisdictions</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(data.jurisdictions || '-')}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Client Type</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(Array.isArray(data.clientType) ? data.clientType.join(', ') : (data.clientType || '-'))}</td></tr>` : '';

  const submittedDate = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:2px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">

<!-- Header -->
<tr><td style="background:#1e1e1e;padding:40px 40px 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td>
    <div style="font-family:Georgia,serif;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#b09a7a;margin-bottom:16px">Konan &amp; Spade</div>
    <div style="font-family:Georgia,serif;font-size:24px;color:#fff;font-weight:400;line-height:1.3">New Brand Brief</div>
    <div style="font-family:-apple-system,sans-serif;font-size:12px;color:#888;margin-top:12px">${esc(data.companyName)} &nbsp;&middot;&nbsp; ${modeLabel} &nbsp;&middot;&nbsp; ${submittedDate}</div>
  </td></tr>
  </table>
</td></tr>

<!-- Client -->
<tr><td style="padding:32px 40px 0">
  <div style="font-family:Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#b09a7a;padding-bottom:12px;border-bottom:2px solid #1e1e1e;margin-bottom:4px">Client</div>
</td></tr>
<tr><td style="padding:0 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Name</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(data.clientName)}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Email</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8"><a href="mailto:${esc(data.clientEmail)}" style="color:#6b5740;text-decoration:none">${esc(data.clientEmail)}</a></td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">${mode === 'lawfirm' ? 'Firm' : 'Company'}</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;font-weight:600;border-bottom:1px solid #f0ede8">${esc(data.companyName)}</td></tr>
  </table>
</td></tr>

<!-- Business / Firm Overview -->
<tr><td style="padding:32px 40px 0">
  <div style="font-family:Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#b09a7a;padding-bottom:12px;border-bottom:2px solid #1e1e1e;margin-bottom:4px">${mode === 'lawfirm' ? 'Firm Overview' : 'Business Overview'}</div>
</td></tr>
<tr><td style="padding:0 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${lawFirmRows}
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">${mode === 'lawfirm' ? 'About the Firm' : 'Description'}</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;line-height:1.7;border-bottom:1px solid #f0ede8">${esc(data.businessDesc || '-')}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">${mode === 'lawfirm' ? 'Ideal Clients' : 'Target Audience'}</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;line-height:1.7;border-bottom:1px solid #f0ede8">${esc(audience)}</td></tr>
  </table>
</td></tr>

<!-- Brand Personality -->
<tr><td style="padding:32px 40px 0">
  <div style="font-family:Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#b09a7a;padding-bottom:12px;border-bottom:2px solid #1e1e1e;margin-bottom:4px">Brand Personality</div>
</td></tr>
<tr><td style="padding:0 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Traits</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(traits)}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Tone of Voice</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;line-height:1.7;border-bottom:1px solid #f0ede8">${esc(data.toneOfVoice || '-')}</td></tr>
  </table>
</td></tr>

<!-- Visual Direction -->
<tr><td style="padding:32px 40px 0">
  <div style="font-family:Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#b09a7a;padding-bottom:12px;border-bottom:2px solid #1e1e1e;margin-bottom:4px">Visual Direction</div>
</td></tr>
<tr><td style="padding:0 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Styles</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(styles)}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Colors</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;border-bottom:1px solid #f0ede8">${esc(colors)}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Competitors</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;line-height:1.7;border-bottom:1px solid #f0ede8">${esc(competitors)}</td></tr>
  <tr><td style="padding:14px 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#8c7b6b;width:160px;vertical-align:top;border-bottom:1px solid #f0ede8">Existing Brand</td><td style="padding:14px 20px;font-size:14px;color:#2d2926;line-height:1.7;border-bottom:1px solid #f0ede8">${esc(existingBrand)}</td></tr>
  </table>
</td></tr>

<!-- Additional Notes -->
<tr><td style="padding:32px 40px 0">
  <div style="font-family:Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#b09a7a;padding-bottom:12px;border-bottom:2px solid #1e1e1e;margin-bottom:4px">Additional Notes</div>
</td></tr>
<tr><td style="padding:16px 40px 0">
  <div style="font-size:14px;color:#2d2926;line-height:1.7">${esc(additionalNotes)}</div>
</td></tr>

<!-- Full Brief -->
<tr><td style="padding:32px 40px 0">
  <div style="font-family:Georgia,serif;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#b09a7a;padding-bottom:12px;border-bottom:2px solid #1e1e1e;margin-bottom:4px">Generated Brief</div>
</td></tr>
<tr><td style="padding:16px 40px 32px">
  <div style="background:#faf8f5;border:1px solid #ebe7e0;padding:20px 24px;font-family:-apple-system,sans-serif;font-size:13px;line-height:1.8;color:#4a4540;white-space:pre-wrap">${esc(briefText || 'No brief text generated')}</div>
</td></tr>

<!-- Footer -->
<tr><td style="background:#faf8f5;padding:24px 40px;border-top:1px solid #ebe7e0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="font-family:-apple-system,sans-serif;font-size:11px;color:#a09890">IP: ${ip}</td>
    <td align="right" style="font-family:-apple-system,sans-serif;font-size:11px;color:#a09890">${submittedDate}</td>
  </tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  const text = briefText || `New brand brief from ${data.clientName} (${data.companyName})`;

  return sesSend(env, to, from, subject, text, html, data.clientEmail);
}

// ── Client Confirmation Email ──
async function sendClientEmail(data, mode, env) {
  const to = data.clientEmail;
  const from = `Konan & Spade <${env.FROM_EMAIL || 'noreply@konanspade.com'}>`;
  const subject = `We've received your brand brief - Konan & Spade`;
  const modeLabel = mode === 'lawfirm' ? 'firm' : 'business';

  const text = `Dear ${data.clientName},

Thank you for submitting your brand design brief for ${data.companyName}. Our team will review your responses and get back to you shortly to discuss next steps.

If you have any questions in the meantime, feel free to reply to this email.

Best regards,
Konan & Spade`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:2px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">

<!-- Header -->
<tr><td style="background:#1e1e1e;padding:48px 44px;text-align:center">
  <div style="font-family:Georgia,serif;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#b09a7a;margin-bottom:20px">Konan &amp; Spade</div>
  <div style="font-family:Georgia,serif;font-size:28px;color:#fff;font-weight:400;line-height:1.2">Thank You</div>
  <div style="width:40px;height:2px;background:#b09a7a;margin:20px auto 0"></div>
</td></tr>

<!-- Body -->
<tr><td style="padding:44px 44px 20px">
  <p style="font-family:Georgia,serif;font-size:16px;color:#2d2926;line-height:1.8;margin:0 0 20px">Dear ${esc(data.clientName)},</p>
  <p style="font-family:Georgia,serif;font-size:15px;color:#4a4540;line-height:1.8;margin:0 0 20px">We've received your brand design brief for <strong style="color:#2d2926">${esc(data.companyName)}</strong> and our creative team is already looking forward to diving in. We'll be in touch shortly to discuss your ${modeLabel}'s brand direction.</p>
</td></tr>

<!-- Closing -->
<tr><td style="padding:0 44px 44px">
  <p style="font-family:Georgia,serif;font-size:15px;color:#4a4540;line-height:1.8;margin:0 0 28px">If you have any additional thoughts or materials to share, simply reply to this email.</p>
  <p style="font-family:Georgia,serif;font-size:15px;color:#2d2926;margin:0">Warm regards,<br><strong>Konan &amp; Spade</strong></p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#1e1e1e;padding:28px 44px;text-align:center">
  <div style="font-family:Georgia,serif;font-size:11px;text-transform:uppercase;letter-spacing:2.5px;color:#b09a7a">&copy; ${new Date().getFullYear()} Konan &amp; Spade</div>
  <div style="font-family:-apple-system,sans-serif;font-size:11px;color:#666;margin-top:8px">Brand Design &amp; Strategy</div>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  return sesSend(env, to, from, subject, text, html);
}

// ── AWS SES v2 ──
async function sesSend(env, to, from, subject, textBody, htmlBody, replyTo) {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_REGION) {
    console.error('Missing AWS SES credentials');
    return;
  }

  const endpoint = `https://email.${env.AWS_REGION}.amazonaws.com`;
  const body = {
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Text: { Data: textBody }, Html: { Data: htmlBody } }
      }
    },
    Destination: { ToAddresses: [to] },
    FromEmailAddress: from
  };
  if (replyTo) body.ReplyToAddresses = [replyTo];

  const res = await awsSesRequest(endpoint, body, env.AWS_ACCESS_KEY_ID, env.AWS_SECRET_ACCESS_KEY, env.AWS_REGION);
  if (!res.ok) console.error('SES error:', await res.text());
  return res;
}

// ── AWS Sig v4 Helpers ──
async function awsSesRequest(endpoint, body, accessKeyId, secretAccessKey, region) {
  const method = 'POST';
  const host = `email.${region}.amazonaws.com`;
  const path = '/v2/email/outbound-emails';
  const bodyString = JSON.stringify(body);
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = timestamp.substring(0, 8);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${timestamp}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const payloadHash = await sha256(bodyString);
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${date}/${region}/ses/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${canonicalRequestHash}`;
  const signature = await getSignature(secretAccessKey, date, region, 'ses', stringToSign);
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`${endpoint}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Host': host, 'X-Amz-Date': timestamp, 'Authorization': authorization },
    body: bodyString
  });
}

async function sha256(message) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key, message) {
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)));
}

async function getSignature(secretAccessKey, date, region, service, stringToSign) {
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return Array.from(await hmacSha256(kSigning, stringToSign)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
}
