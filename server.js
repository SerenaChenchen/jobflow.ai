const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Helper to parse date strings from 104 job listings (format: YYYY/MM/DD)
function parse104Date(str) {
  const parts = str.trim().split('/')
    .map(p => p.padStart(2, '0'));
  return parts.length === 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : null;
}

// 104 Job Scraper – simple public search page scraping
app.get('/api/jobs/104', async (req, res) => {
  const query = req.query.q || '';
  const fromDate = req.query.from; // expected ISO YYYY-MM-DD
  const url = `https://www.104.com.tw/jobs/search/?ro=0&kw=${encodeURIComponent(query)}&order=12&mode=s&jobsource=2018`; // order=12 sorts by newest
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await response.text();
    const $ = cheerio.load(html);
    const jobs = [];
    $('article.b-block--left').each((_, el) => {
      const title = $(el).find('a[data-testid="jobTitle"]').text().trim();
      const company = $(el).find('.b-list-inline li a').first().text().trim();
      const link = $(el).find('a[data-testid="jobTitle"]').attr('href');
      const dateStr = $(el).find('.b-tit__date').text().trim(); // format: 2026/06/05
      const isoDate = fromDate ? parse104Date(dateStr) : null;
      if (fromDate && isoDate && isoDate < fromDate) return; // skip older
      jobs.push({
        id: link,
        title,
        company,
        location: '',
        description: '',
        deadline: isoDate || '',
        source: '104',
        url: link ? `https://www.104.com.tw${link}` : ''
      });
    });
    res.json(jobs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch 104 jobs' });
  }
});

// LinkedIn placeholder – returns empty array (requires OAuth for real data)
app.get('/api/jobs/linkedin', async (req, res) => {
  const fromDate = req.query.from; // not used in placeholder
  // TODO: implement LinkedIn Jobs API call with OAuth token
  res.json([]);
});

app.listen(PORT, () => console.log(`Crawler server running on port ${PORT}`));
