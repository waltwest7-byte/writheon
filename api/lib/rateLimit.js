// Rate limiting via Supabase
// Limits: 20 req / 15 min per IP per endpoint
const { supabaseUpsert, supabaseSelect } = require('./supabase');

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const LIMITS = {
  analyze: 15,
  advisor: 30,
  rewrite: 10,
  default: 20
};

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

async function checkRateLimit(req, endpoint) {
  const ip = getIp(req);
  const limit = LIMITS[endpoint] || LIMITS.default;

  try {
    const rows = await supabaseSelect(
      'rate_limits',
      `ip=eq.${encodeURIComponent(ip)}&endpoint=eq.${encodeURIComponent(endpoint)}`
    );
    const row = rows && rows[0];
    const now = Date.now();

    if (!row || (now - new Date(row.window_start).getTime()) > WINDOW_MS) {
      // New window — reset
      await supabaseUpsert('rate_limits',
        { ip, endpoint, requests: 1, window_start: new Date().toISOString() },
        'ip,endpoint'
      );
      return { allowed: true, remaining: limit - 1 };
    }

    if (row.requests >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment
    await fetch(
      `${process.env.SUPABASE_URL || 'https://fimzcbegyxiawcwsbqcp.supabase.co'}/rest/v1/rate_limits?ip=eq.${encodeURIComponent(ip)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbXpjYmVneXhpYXdjd3NicWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTgyNDcsImV4cCI6MjA5NDI5NDI0N30.RxFXJCVNznSp8Beb92XcRV8-myh1kaAjZXsNeiyXqq8',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbXpjYmVneXhpYXdjd3NicWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTgyNDcsImV4cCI6MjA5NDI5NDI0N30.RxFXJCVNznSp8Beb92XcRV8-myh1kaAjZXsNeiyXqq8'}`
        },
        body: JSON.stringify({ requests: row.requests + 1 })
      }
    );

    return { allowed: true, remaining: limit - row.requests - 1 };
  } catch (e) {
    // If rate limit check fails, allow the request (fail open)
    console.error('[rateLimit] error:', e.message);
    return { allowed: true, remaining: -1 };
  }
}

module.exports = { checkRateLimit };
