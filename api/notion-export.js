/**
 * Notion Export — creates a professional coverage report page in Notion
 * Requires: NOTION_API_KEY and NOTION_PARENT_PAGE_ID in Vercel env vars
 * Pro and Founding tier only (enforced client-side; this endpoint validates the unlock code server-side would be ideal)
 */

const VALID_CODES = new Set([
  'WRITHEON-PRO-2026',
  'WRITHEON-BETA-2026',
  'WRITHEON-FOUNDING-2026',
  'WRITHEON-GMOE-ADMIN',
]);

function richText(text) {
  const str = String(text || '').substring(0, 1990);
  return [{ type: 'text', text: { content: str } }];
}

function heading2(text) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: richText(text) } };
}

function heading3(text) {
  return { object: 'block', type: 'heading_3', heading_3: { rich_text: richText(text) } };
}

function paragraph(text) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText(text) } };
}

function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}

function bulletItem(text) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: richText(text) } };
}

function callout(text, emoji) {
  return {
    object: 'block', type: 'callout',
    callout: { rich_text: richText(text), icon: { type: 'emoji', emoji: emoji || '📋' } }
  };
}

function buildCoverageBlocks(r) {
  const blocks = [];
  const today  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const scores = r.scores || {};

  // Header callout
  blocks.push(callout(
    `WRITHEON SDE™ — Professional Script Coverage | ${r._title || 'Untitled'} | ${today}`,
    '🎬'
  ));
  blocks.push(divider());

  // Section 1 — Executive Summary
  blocks.push(heading2('Section 1 — Executive Summary'));
  blocks.push(callout(
    `Writheon Score™: ${r._writheonScore || '—'}/100 | Verdict: ${r.verdict || '—'} | Letter Grade: ${r.score || '—'}`,
    r.verdict === 'PASS' ? '✅' : r.verdict === 'CONSIDER' ? '⚡' : '❌'
  ));
  blocks.push(paragraph(r.executiveSummary || r.coverageNotes || 'See full analysis below.'));
  blocks.push(divider());

  // Section 2 — Score Breakdown
  blocks.push(heading2('Section 2 — Score Breakdown (Eight Dimensions)'));
  const scoreDimensions = [
    ['Structure',         scores.structure],
    ['Character',         scores.character],
    ['Dialogue',          scores.dialogue],
    ['Pacing',            scores.pacing],
    ['Premise',           scores.premise],
    ['Marketability',     scores.marketability],
    ['Emotional Impact',  scores.emotionalImpact],
    ['Series Potential',  scores.seriesPotential],
  ];
  scoreDimensions.forEach(([label, val]) => {
    if (val !== undefined) {
      const bar = '█'.repeat(Math.round((val || 0) / 10)) + '░'.repeat(10 - Math.round((val || 0) / 10));
      blocks.push(paragraph(`${label}: ${val}/100  ${bar}`));
    }
  });
  blocks.push(divider());

  // Section 3 — Act One Diagnostic
  blocks.push(heading2('Section 3 — Act One Diagnostic'));
  blocks.push(paragraph(r.act1Analysis || 'Act One analysis not available.'));
  blocks.push(divider());

  // Section 4 — Act Two Diagnostic
  blocks.push(heading2('Section 4 — Act Two Diagnostic'));
  blocks.push(paragraph(r.act2Analysis || 'Act Two analysis not available.'));
  blocks.push(divider());

  // Section 5 — Act Three Diagnostic
  blocks.push(heading2('Section 5 — Act Three Diagnostic'));
  blocks.push(paragraph(r.act3Analysis || 'Act Three analysis not available.'));
  blocks.push(divider());

  // Section 6 — Rewrite Roadmap
  blocks.push(heading2('Section 6 — Rewrite Roadmap'));
  const priorities = r.priorities || [];
  if (Array.isArray(priorities) && priorities.length > 0) {
    priorities.forEach((p, i) => {
      if (typeof p === 'object' && p !== null) {
        blocks.push(heading3(`Priority ${i + 1}: ${p.problem || p.issue || 'Issue'}`));
        if (p.framework) blocks.push(paragraph(`Framework: ${p.framework}`));
        if (p.severity)  blocks.push(paragraph(`Severity: ${p.severity}`));
        if (p.estimatedGain) blocks.push(paragraph(`Estimated Score Gain: ${p.estimatedGain}`));
        if (p.fix)       blocks.push(paragraph(`Fix: ${p.fix}`));
      } else {
        blocks.push(bulletItem(String(p)));
      }
    });
  } else {
    blocks.push(paragraph('No priority rewrites available.'));
  }
  blocks.push(divider());

  // Section 7 — Character Diagnosis
  blocks.push(heading2('Section 7 — Character Diagnosis'));
  blocks.push(paragraph(r.characterDiagnosis || r.structuralAssessment || 'Character diagnosis not available.'));
  blocks.push(divider());

  // Section 8 — Dialogue Diagnosis
  blocks.push(heading2('Section 8 — Dialogue Diagnosis'));
  blocks.push(paragraph(r.dialogueDiagnosis || 'Dialogue diagnosis not available.'));
  blocks.push(divider());

  // Section 9 — Recommended Development Resources
  blocks.push(heading2('Section 9 — Recommended Development Resources'));
  const weakAreas = r.weakAreas || [];
  const resourceMap = {
    structure:     { addon: 'Add-On 18: Beat Sheet System', url: 'https://writheon.gumroad.com/l/addon-18-beatsheet', why: 'Act structure instability detected. The Beat Sheet System rebuilds your beat architecture from the wound up.' },
    character:     { addon: 'Add-On 21: Character Activation System', url: 'https://writheon.gumroad.com', why: 'Character pressure failure detected. This system diagnoses the exact activation failure mode and prescribes the fix.' },
    dialogue:      { addon: 'Add-On 04: Dialogue Punch-Up System', url: 'https://writheon.gumroad.com', why: 'Dialogue compression issues detected. The Dialogue Punch-Up System removes Voice Collapse and surfaces Hidden Conversations.' },
    pacing:        { addon: 'Add-On 20: Pacing System', url: 'https://writheon.gumroad.com', why: 'Pacing irregularities detected. The Pacing System installs Compression/Expansion Rhythm and Breath Scene architecture.' },
    premise:       { addon: 'Add-On 15: Concept Engine', url: 'https://writheon.gumroad.com', why: 'Premise clarity issues detected. The Concept Engine strengthens the Irresistible Question and Escalation Potential.' },
    marketability: { addon: 'Add-On 11: Development Executive', url: 'https://writheon.gumroad.com', why: 'Commercial positioning needs work. The Dev Exec Add-On reframes the concept for the current market.' },
  };
  const areasToShow = weakAreas.length > 0 ? weakAreas : ['structure', 'character'];
  areasToShow.slice(0, 4).forEach(area => {
    const r2 = resourceMap[area];
    if (r2) {
      blocks.push(heading3(r2.addon));
      blocks.push(paragraph(r2.why));
      blocks.push(paragraph(`Get it at: ${r2.url}`));
    }
  });

  return blocks;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (!body || typeof body !== 'object') {
    const raw = await new Promise((resolve, reject) => {
      let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', reject);
    });
    try { body = JSON.parse(raw); } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { result, unlockCode } = body;

  // Validate unlock code (Pro/Founding only)
  if (!unlockCode || !VALID_CODES.has(unlockCode.trim().toUpperCase())) {
    return res.status(403).json({ error: 'Notion export requires Pro or Founding access.' });
  }

  if (!result) return res.status(400).json({ error: 'Missing: result' });

  const notionKey      = process.env.NOTION_API_KEY;
  const parentPageId   = process.env.NOTION_PARENT_PAGE_ID;

  if (!notionKey || !parentPageId) {
    return res.status(503).json({
      error: 'Notion not configured',
      detail: 'Add NOTION_API_KEY and NOTION_PARENT_PAGE_ID to Vercel environment variables.'
    });
  }

  const today   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const title   = `${result._title || 'Untitled'} — Writheon Coverage — ${today}`;
  const blocks  = buildCoverageBlocks(result);

  // Notion API allows max 100 blocks per request — split if needed
  const CHUNK = 95;
  const chunks = [];
  for (let i = 0; i < blocks.length; i += CHUNK) {
    chunks.push(blocks.slice(i, i + CHUNK));
  }

  try {
    // Create the page
    const createRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: parentPageId },
        properties: { title: { title: richText(title) } },
        children: chunks[0] || []
      })
    });

    const pageData = await createRes.json();
    if (!createRes.ok) {
      console.error('[notion-export] Create page failed:', JSON.stringify(pageData).substring(0, 300));
      return res.status(502).json({ error: 'Notion API error', detail: pageData.message || 'Unknown error' });
    }

    const pageId  = pageData.id;
    const pageUrl = pageData.url;

    // Append remaining block chunks
    for (let i = 1; i < chunks.length; i++) {
      await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${notionKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({ children: chunks[i] })
      });
    }

    return res.status(200).json({ success: true, url: pageUrl, pageId });
  } catch (err) {
    console.error('[notion-export] error:', err.message);
    return res.status(500).json({ error: 'Export failed', detail: err.message });
  }
};
