// Shared Supabase client for serverless functions
const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://fimzcbegyxiawcwsbqcp.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbXpjYmVneXhpYXdjd3NicWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTgyNDcsImV4cCI6MjA5NDI5NDI0N30.RxFXJCVNznSp8Beb92XcRV8-myh1kaAjZXsNeiyXqq8';

async function supabaseInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error(`[supabase] insert ${table} failed:`, res.status, err.substring(0,200));
  }
  return res.ok;
}

async function supabaseUpsert(table, row, onConflict) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(row)
  });
  return res.ok;
}

async function supabaseSelect(table, filters = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`
    }
  });
  if (!res.ok) return null;
  return res.json();
}

module.exports = { supabaseInsert, supabaseUpsert, supabaseSelect };
