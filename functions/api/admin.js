export async function onRequestGet(context) {
  const { request, env } = context;

  const authError = checkAuth(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const row = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    row.data = JSON.parse(row.data);
    return json(row);
  }

  const status = url.searchParams.get('status');
  const mode = url.searchParams.get('mode');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = 'SELECT id, mode, client_name, client_email, company_name, status, notes, created_at FROM submissions WHERE 1=1';
  const binds = [];

  if (status) { query += ' AND status = ?'; binds.push(status); }
  if (mode) { query += ' AND mode = ?'; binds.push(mode); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...binds).all();

  const countQuery = 'SELECT COUNT(*) as total FROM submissions';
  const { total } = await env.DB.prepare(countQuery).first();

  return json({ submissions: results, total, limit, offset });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const authError = checkAuth(request, env);
  if (authError) return authError;

  const body = await request.json();
  const { formData, mode, notes } = body;

  if (!formData || !formData.clientName || !formData.clientEmail || !formData.companyName) {
    return json({ error: 'clientName, clientEmail, and companyName required' }, 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO submissions (mode, client_name, client_email, company_name, data, brief_text, notes, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', 'admin')`
  ).bind(
    mode || 'general',
    formData.clientName,
    formData.clientEmail,
    formData.companyName,
    JSON.stringify(formData),
    body.briefText || '',
    notes || ''
  ).run();

  return json({ success: true, id: result.meta.last_row_id }, 201);
}

export async function onRequestPut(context) {
  const { request, env } = context;

  const authError = checkAuth(request, env);
  if (authError) return authError;

  const body = await request.json();
  const { id, formData, mode, briefText, notes, status } = body;

  if (!id) return json({ error: 'id required' }, 400);

  const existing = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Not found' }, 404);

  const newData = formData ? JSON.stringify(formData) : existing.data;
  const newMode = mode || existing.mode;
  const newBrief = briefText !== undefined ? briefText : existing.brief_text;
  const newNotes = notes !== undefined ? notes : existing.notes;
  const newStatus = status || existing.status;
  const newClientName = formData?.clientName || existing.client_name;
  const newClientEmail = formData?.clientEmail || existing.client_email;
  const newCompanyName = formData?.companyName || existing.company_name;

  if (!['new', 'reviewed', 'in-progress', 'completed', 'archived'].includes(newStatus)) {
    return json({ error: 'Invalid status' }, 400);
  }

  await env.DB.prepare(
    `UPDATE submissions SET mode = ?, client_name = ?, client_email = ?, company_name = ?, data = ?, brief_text = ?, notes = ?, status = ? WHERE id = ?`
  ).bind(newMode, newClientName, newClientEmail, newCompanyName, newData, newBrief, newNotes, newStatus, id).run();

  return json({ success: true });
}

export async function onRequestPatch(context) {
  const { request, env } = context;

  const authError = checkAuth(request, env);
  if (authError) return authError;

  const body = await request.json();
  const { id, ids, status, notes } = body;

  const targetIds = ids || (id ? [id] : []);
  if (!targetIds.length) return json({ error: 'id or ids required' }, 400);

  if (status) {
    if (!['new', 'reviewed', 'in-progress', 'completed', 'archived'].includes(status)) {
      return json({ error: 'Invalid status' }, 400);
    }
    const stmt = env.DB.prepare('UPDATE submissions SET status = ? WHERE id = ?');
    await env.DB.batch(targetIds.map(i => stmt.bind(status, i)));
  }

  if (notes !== undefined && targetIds.length === 1) {
    await env.DB.prepare('UPDATE submissions SET notes = ? WHERE id = ?').bind(notes, targetIds[0]).run();
  }

  return json({ success: true, affected: targetIds.length });
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  const authError = checkAuth(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const idsParam = url.searchParams.get('ids');

  const targetIds = idsParam ? idsParam.split(',') : (id ? [id] : []);
  if (!targetIds.length) return json({ error: 'id or ids required' }, 400);

  const stmt = env.DB.prepare('DELETE FROM submissions WHERE id = ?');
  await env.DB.batch(targetIds.map(i => stmt.bind(i)));

  return json({ success: true, affected: targetIds.length });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization');
  const token = env.ADMIN_TOKEN;
  if (!token) return json({ error: 'Admin not configured' }, 500);
  if (!auth || auth !== `Bearer ${token}`) return json({ error: 'Unauthorized' }, 401);
  return null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
}
