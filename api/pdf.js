// Server-side PDF report — returns a formatted print-ready HTML page
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const raw = await new Promise((resolve, reject) => {
        let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) { body = {}; }
    }

    const {
      title = 'Untitled', genre = '', voice = 'Development Executive',
      mode = 'Coverage', verdict = '—', score = '—', writheonScore = '—',
      scores = {}, coverageNotes = '', structuralAssessment = '',
      priorities = [], weakAreas = [], suggestions = {}
    } = body;

    const scoreColor = verdict === 'PASS' ? '#3d9e6a' : verdict === 'CONSIDER' ? '#d4892a' : '#bf3b2e';
    const scoreLabels = { premise: 'Premise', structure: 'Structure', character: 'Character', dialogue: 'Dialogue', pacing: 'Pacing', commerciality: 'Commerciality' };

    const scoreBars = Object.entries(scores).map(([k, v]) => {
      const color = v >= 70 ? '#3d9e6a' : v >= 45 ? '#d4892a' : '#bf3b2e';
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:10px;color:#6b6560;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">
          <span>${scoreLabels[k] || k}</span><span style="color:${color}">${v}%</span>
        </div>
        <div style="height:3px;background:#1c1c1c">
          <div style="height:100%;width:${v}%;background:${color}"></div>
        </div>
      </div>`;
    }).join('');

    const priorityItems = priorities.map((p, i) => `
      <div style="padding:12px 16px;background:#0f0f0f;border-left:2px solid #a8853a;margin-bottom:8px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:#a8853a;letter-spacing:.16em;text-transform:uppercase;margin-bottom:4px">Priority ${i+1}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:#a8a29a;line-height:1.6">${p}</div>
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Writheon Coverage Report — ${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #060606; color: #ece8e0; font-family: 'Cormorant Garamond', serif; padding: 48px; max-width: 900px; margin: 0 auto; }
  @media print {
    body { background: white; color: #111; padding: 32px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<!-- Header -->
<div style="border-bottom:1px solid #1c1c1c;padding-bottom:32px;margin-bottom:40px;display:flex;align-items:flex-start;justify-content:space-between">
  <div>
    <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.24em;color:#c8a44a;text-transform:uppercase;margin-bottom:8px">Writheon Coverage Engine™</div>
    <div style="font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:.04em;color:#f4f0e8">${title}</div>
    ${genre ? `<div style="font-family:'DM Mono',monospace;font-size:10px;color:#6b6560;letter-spacing:.14em;text-transform:uppercase;margin-top:6px">${genre} · ${mode}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:64px;line-height:1;color:${scoreColor}">${score}</div>
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:${scoreColor};letter-spacing:.14em;text-transform:uppercase">${verdict}</div>
    <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6b6560;letter-spacing:.1em;text-transform:uppercase;margin-top:4px">${voice}</div>
  </div>
</div>

<!-- Writheon Score -->
<div style="background:#0f0f0f;border:1px solid #1c1c1c;padding:24px 28px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between">
  <div style="display:flex;align-items:flex-end;gap:16px">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:64px;line-height:1;color:#c8a44a">${writheonScore}</div>
    <div style="padding-bottom:8px">
      <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:400;letter-spacing:.16em;color:#ece8e0;text-transform:uppercase">WRITHEON SCORE™</div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6b6560;letter-spacing:.1em;text-transform:uppercase;margin-top:3px">Composite SDE™ Diagnostic</div>
    </div>
  </div>
</div>

<!-- Score breakdown -->
<div style="margin-bottom:32px">
  <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.18em;color:#c8a44a;text-transform:uppercase;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #1c1c1c">Score Breakdown</div>
  ${scoreBars}
</div>

<!-- Coverage Notes -->
${coverageNotes ? `<div style="margin-bottom:28px">
  <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.18em;color:#c8a44a;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1c1c1c">Coverage Notes</div>
  <div style="font-size:17px;font-weight:300;line-height:1.85;color:#a8a29a">${coverageNotes}</div>
</div>` : ''}

<!-- Structural Assessment -->
${structuralAssessment ? `<div style="margin-bottom:28px">
  <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.18em;color:#c8a44a;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1c1c1c">Structural Assessment</div>
  <div style="font-size:17px;font-weight:300;line-height:1.85;color:#a8a29a">${structuralAssessment}</div>
</div>` : ''}

<!-- Priority Rewrites -->
${priorities.length ? `<div style="margin-bottom:28px">
  <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.18em;color:#c8a44a;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1c1c1c">Priority Rewrites</div>
  ${priorityItems}
</div>` : ''}

<!-- Footer -->
<div style="border-top:1px solid #1c1c1c;padding-top:20px;margin-top:32px;display:flex;align-items:center;justify-content:space-between">
  <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6b6560;letter-spacing:.12em;text-transform:uppercase">Writheon SDE™ · writheon.com</div>
  <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6b6560;letter-spacing:.1em">${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</div>
</div>

<div class="no-print" style="position:fixed;bottom:24px;right:24px">
  <button onclick="window.print()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;background:#c8a44a;color:#060606;border:none;padding:12px 24px;cursor:pointer">Save as PDF</button>
</div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('[pdf] error:', err.message);
    return res.status(500).json({ error: 'PDF error' });
  }
};
