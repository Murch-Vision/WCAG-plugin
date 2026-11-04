/**
 * reportEndpoint-ийн жишээ хүлээн авагч (Node.js, хамааралгүй).
 *   node examples/report-server.js  →  POST http://localhost:8787/a11y-report
 * Бодит системд үүнийг өөрийн log/BI/ticketing (Jira, Redmine) руу дамжуулна.
 */
import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';

const PORT = process.env.PORT || 8787;
createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST' || req.url !== '/a11y-report') { res.statusCode = 404; return res.end(); }
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
  req.on('end', () => {
    try {
      const r = JSON.parse(body);
      const row = { at: new Date().toISOString(), url: r.url, level: r.level, fail: r.summary.fail, review: r.summary.review, fixed: r.summary.fixed, critical: r.summary.byImpact.critical };
      appendFileSync('a11y-reports.ndjson', JSON.stringify({ ...row, findings: r.findings.map((f) => ({ rule: f.ruleId, sc: f.sc, impact: f.impact, outcome: f.outcome, fixed: f.fixed, selector: f.selector })) }) + '\n');
      console.log(row);
      res.statusCode = 204; res.end();
    } catch { res.statusCode = 400; res.end(); }
  });
}).listen(PORT, () => console.log(`hurteemj report receiver: http://localhost:${PORT}/a11y-report`));
