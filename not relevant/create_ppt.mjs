import pptxgen from 'pptxgenjs';

const prs = new pptxgen();

// AIA Brand Colors
const RED = '#D71920';
const DARK = '#1D1D1B';
const WHITE = '#FFFFFF';
const LIGHT_GRAY = '#F5F5F5';
const MID_GRAY = '#CCCCCC';
const GOLD = '#C4A45A';

prs.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function addSlideHeader(slide, title, subtitle = '') {
  // Red top bar
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.12, fill: { color: RED } });
  // Dark side accent bar
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0.12, w: 0.08, h: 7.38, fill: { color: DARK } });
  // Light background
  slide.addShape(prs.ShapeType.rect, { x: 0.08, y: 0.12, w: 13.25, h: 7.38, fill: { color: WHITE } });
  // Title block background
  slide.addShape(prs.ShapeType.rect, { x: 0.08, y: 0.12, w: 13.25, h: 1.1, fill: { color: DARK } });
  // Title text
  slide.addText(title, {
    x: 0.35, y: 0.18, w: 10, h: 0.6,
    fontSize: 24, bold: true, color: WHITE, fontFace: 'Calibri',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.35, y: 0.72, w: 10, h: 0.4,
      fontSize: 13, color: GOLD, fontFace: 'Calibri', italic: true,
    });
  }
  // AIA logo placeholder (text)
  slide.addText('AIA', {
    x: 11.5, y: 0.18, w: 1.6, h: 0.7,
    fontSize: 28, bold: true, color: RED, fontFace: 'Calibri', align: 'right',
  });
  // Bottom bar
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 7.3, w: '100%', h: 0.2, fill: { color: RED } });
}

function addBullets(slide, items, x, y, w, h, opts = {}) {
  const textItems = items.map((item, i) => {
    if (typeof item === 'string') {
      return { text: item, options: { bullet: { type: 'bullet', indent: 15 }, fontSize: opts.fontSize || 14, color: opts.color || DARK, fontFace: 'Calibri', breakLine: i < items.length - 1 } };
    }
    // { text, sub } for sub-bullets
    return [
      { text: item.text, options: { bullet: { type: 'bullet', indent: 15 }, fontSize: opts.fontSize || 14, bold: item.bold || false, color: opts.color || DARK, fontFace: 'Calibri', breakLine: true } },
      ...(item.sub || []).map((s, j) => ({ text: s, options: { bullet: { type: 'bullet', indent: 40 }, fontSize: (opts.fontSize || 14) - 1.5, color: '#444444', fontFace: 'Calibri', breakLine: j < item.sub.length - 1 } })),
    ];
  }).flat();

  slide.addText(textItems, { x, y, w, h, valign: 'top', wrap: true });
}

// ─────────────────────────────────────────────
// SLIDE 1 — TITLE / COVER
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  // Full dark background
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK } });
  // Red accent block left
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: '100%', fill: { color: RED } });
  // Gold horizontal divider
  slide.addShape(prs.ShapeType.rect, { x: 0.35, y: 3.55, w: 12.98, h: 0.05, fill: { color: GOLD } });
  // Bottom red strip
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 7.3, w: '100%', h: 0.2, fill: { color: RED } });

  slide.addText('AIA', {
    x: 0.6, y: 0.4, w: 3, h: 0.9,
    fontSize: 52, bold: true, color: RED, fontFace: 'Calibri',
  });
  slide.addText('Interview Presentation', {
    x: 0.6, y: 1.3, w: 10, h: 0.5,
    fontSize: 18, color: GOLD, fontFace: 'Calibri', italic: true,
  });
  slide.addText('[Your Full Name]', {
    x: 0.6, y: 2.3, w: 11, h: 0.9,
    fontSize: 36, bold: true, color: WHITE, fontFace: 'Calibri',
  });
  slide.addText('[Position Applied For]', {
    x: 0.6, y: 3.15, w: 11, h: 0.5,
    fontSize: 20, color: MID_GRAY, fontFace: 'Calibri',
  });
  slide.addText('[Date] | [Location]', {
    x: 0.6, y: 3.75, w: 8, h: 0.4,
    fontSize: 14, color: MID_GRAY, fontFace: 'Calibri',
  });
  slide.addText('"Committed to helping people live healthier, longer, better lives."', {
    x: 0.6, y: 5.5, w: 11.5, h: 0.8,
    fontSize: 15, italic: true, color: GOLD, fontFace: 'Calibri',
  });
}

// ─────────────────────────────────────────────
// SLIDE 2 — GET TO KNOW ME (Anderson Wong)
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  addSlideHeader(slide, 'Get to Know Me', 'Anderson Wong, PMP');

  // ── LEFT COLUMN (content) ──────────────────
  const LEFT_X = 0.35;
  const COL_W = 8.6;

  // NAME BANNER
  slide.addShape(prs.ShapeType.rect, { x: LEFT_X, y: 1.38, w: COL_W, h: 0.52, fill: { color: DARK } });
  slide.addText('Anderson Wong, PMP', {
    x: LEFT_X + 0.18, y: 1.38, w: COL_W - 0.3, h: 0.52,
    fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri', valign: 'middle',
  });

  // ── SECTION: Experience with Data ──
  let y = 2.05;
  slide.addShape(prs.ShapeType.rect, { x: LEFT_X, y, w: COL_W, h: 0.3, fill: { color: RED } });
  slide.addText('Experience with Data', { x: LEFT_X + 0.12, y, w: COL_W, h: 0.3, fontSize: 11, bold: true, color: WHITE, fontFace: 'Calibri', valign: 'middle' });
  y += 0.35;
  slide.addText([
    { text: '~10 years', options: { bold: true, color: RED } },
    { text: ' in Data / Analytics Field', options: { color: DARK } },
  ], { x: LEFT_X + 0.25, y, w: COL_W - 0.3, h: 0.32, fontSize: 12.5, fontFace: 'Calibri', bullet: { type: 'bullet', indent: 10 } });
  y += 0.35;
  slide.addText('Experienced across analytics, data management, data governance, and AI projects', {
    x: LEFT_X + 0.25, y, w: COL_W - 0.3, h: 0.38,
    fontSize: 12.5, color: DARK, fontFace: 'Calibri', bullet: { type: 'bullet', indent: 10 }, wrap: true,
  });

  // ── SECTION: Current Role ──
  y += 0.52;
  slide.addShape(prs.ShapeType.rect, { x: LEFT_X, y, w: COL_W, h: 0.3, fill: { color: RED } });
  slide.addText('Current Role', { x: LEFT_X + 0.12, y, w: COL_W, h: 0.3, fontSize: 11, bold: true, color: WHITE, fontFace: 'Calibri', valign: 'middle' });
  y += 0.35;
  slide.addText('Deputy Manager — Data Management & Analysis, OOCL', {
    x: LEFT_X + 0.25, y, w: COL_W - 0.3, h: 0.32,
    fontSize: 12.5, bold: true, color: DARK, fontFace: 'Calibri', bullet: { type: 'bullet', indent: 10 },
  });
  y += 0.35;
  slide.addText('Team Leader of Analytics', {
    x: LEFT_X + 0.25, y, w: COL_W - 0.3, h: 0.28,
    fontSize: 11.5, color: '#555555', italic: true, fontFace: 'Calibri',
  });
  y += 0.3;
  const roleSubBullets = [
    'Led multiple Analytics and AI projects',
    'Managed a team across Hong Kong (HKG) and Zhuhai (ZHA)',
  ];
  roleSubBullets.forEach(txt => {
    slide.addText(`– ${txt}`, {
      x: LEFT_X + 0.6, y, w: COL_W - 0.7, h: 0.28,
      fontSize: 11.5, color: '#444444', fontFace: 'Calibri',
    });
    y += 0.3;
  });

  // ── SECTION: Education ──
  y += 0.1;
  slide.addShape(prs.ShapeType.rect, { x: LEFT_X, y, w: COL_W, h: 0.3, fill: { color: RED } });
  slide.addText('Education', { x: LEFT_X + 0.12, y, w: COL_W, h: 0.3, fontSize: 11, bold: true, color: WHITE, fontFace: 'Calibri', valign: 'middle' });
  y += 0.35;
  slide.addText('MSc in Data Science and Business Statistics', {
    x: LEFT_X + 0.25, y, w: COL_W - 0.3, h: 0.3,
    fontSize: 12.5, bold: true, color: DARK, fontFace: 'Calibri', bullet: { type: 'bullet', indent: 10 },
  });
  y += 0.33;
  slide.addText('Bachelor of Integrated Business Administration (Concentration: Management Information System)', {
    x: LEFT_X + 0.25, y, w: COL_W - 0.3, h: 0.38,
    fontSize: 12.5, color: DARK, fontFace: 'Calibri', bullet: { type: 'bullet', indent: 10 }, wrap: true,
  });

  // ── BOTTOM ROW: BI Tools + Languages ──
  y += 0.52;
  // BI Tools pill
  slide.addShape(prs.ShapeType.rect, { x: LEFT_X, y, w: 4.1, h: 0.48, fill: { color: DARK }, line: { color: RED, width: 1 } });
  slide.addText('BI Tools  |  Tableau  ·  TIBCO Spotfire', {
    x: LEFT_X + 0.15, y: y + 0.02, w: 3.85, h: 0.42,
    fontSize: 11.5, color: WHITE, fontFace: 'Calibri', valign: 'middle',
  });
  // Languages pill
  slide.addShape(prs.ShapeType.rect, { x: LEFT_X + 4.3, y, w: 4.25, h: 0.48, fill: { color: DARK }, line: { color: GOLD, width: 1 } });
  slide.addText('Languages  |  English  ·  Mandarin  ·  Cantonese', {
    x: LEFT_X + 4.45, y: y + 0.02, w: 4.05, h: 0.42,
    fontSize: 11.5, color: WHITE, fontFace: 'Calibri', valign: 'middle',
  });

  // ── RIGHT COLUMN: Photo placeholders ──
  const RIGHT_X = 9.15;
  // Professional photo box
  slide.addShape(prs.ShapeType.rect, { x: RIGHT_X, y: 1.38, w: 3.85, h: 2.9, fill: { color: LIGHT_GRAY }, line: { color: MID_GRAY, width: 1 } });
  slide.addText('[Professional\nPhoto]', {
    x: RIGHT_X, y: 2.5, w: 3.85, h: 0.7,
    align: 'center', color: MID_GRAY, fontSize: 13, fontFace: 'Calibri',
  });

  // "I ❤ DATA" fun photo box
  slide.addShape(prs.ShapeType.rect, { x: RIGHT_X, y: 4.45, w: 3.85, h: 2.65, fill: { color: '#E8F4FF' }, line: { color: '#7EC8E3', width: 1 } });
  slide.addText('[ Fun Photo ]', {
    x: RIGHT_X, y: 5.65, w: 3.85, h: 0.5,
    align: 'center', color: '#7EC8E3', fontSize: 13, fontFace: 'Calibri',
  });
}

// ─────────────────────────────────────────────
// SLIDE 3 — CAREER JOURNEY
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  addSlideHeader(slide, 'Career Journey', 'A Track Record of Progressive Growth');

  const roles = [
    { company: '[Company A]', period: '[Year–Year]', title: '[Role Title]', points: ['Key achievement or responsibility', 'Key achievement or responsibility'] },
    { company: '[Company B]', period: '[Year–Year]', title: '[Role Title]', points: ['Key achievement or responsibility', 'Key achievement or responsibility'] },
    { company: '[Company C]', period: '[Year–Year]', title: '[Role Title]', points: ['Key achievement or responsibility', 'Key achievement or responsibility'] },
  ];

  // Timeline line
  slide.addShape(prs.ShapeType.line, { x: 1.1, y: 1.4, w: 0, h: 5.6, line: { color: RED, width: 2 } });

  roles.forEach((role, i) => {
    const y = 1.35 + i * 1.9;
    // Circle dot
    slide.addShape(prs.ShapeType.ellipse, { x: 0.82, y: y + 0.1, w: 0.28, h: 0.28, fill: { color: RED } });
    // Period badge
    slide.addShape(prs.ShapeType.rect, { x: 1.55, y: y, w: 1.8, h: 0.3, fill: { color: DARK } });
    slide.addText(role.period, { x: 1.55, y: y, w: 1.8, h: 0.3, align: 'center', fontSize: 10, color: WHITE, bold: true, fontFace: 'Calibri' });
    // Company & title
    slide.addText(`${role.company}  —  ${role.title}`, { x: 3.5, y: y, w: 9.6, h: 0.35, fontSize: 14, bold: true, color: DARK, fontFace: 'Calibri' });
    // Bullet points
    role.points.forEach((pt, j) => {
      slide.addText(`• ${pt}`, { x: 3.5, y: y + 0.4 + j * 0.4, w: 9.6, h: 0.38, fontSize: 12, color: '#444444', fontFace: 'Calibri' });
    });
    // Divider
    if (i < roles.length - 1) {
      slide.addShape(prs.ShapeType.line, { x: 1.55, y: y + 1.7, w: 11.5, h: 0, line: { color: MID_GRAY, width: 0.5 } });
    }
  });
}

// ─────────────────────────────────────────────
// SLIDE 4 — CORE COMPETENCIES
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  addSlideHeader(slide, 'Core Competencies', 'Skills That Drive Results');

  const competencies = [
    { icon: '📊', title: 'Sales & Distribution', desc: 'Building and scaling agency networks; channel development; revenue growth strategies' },
    { icon: '🤝', title: 'Relationship Management', desc: 'Client retention, stakeholder engagement, and long-term partnership building' },
    { icon: '👥', title: 'Leadership & Coaching', desc: 'Team development, performance management, and talent cultivation' },
    { icon: '📈', title: 'Business Development', desc: 'Market expansion, new business acquisition, P&L accountability' },
    { icon: '🔍', title: 'Analytics & Strategy', desc: 'Data-driven decision making, KPI tracking, and operational planning' },
    { icon: '🌐', title: 'Digital & Innovation', desc: 'Leveraging digital tools and fintech solutions to enhance customer experience' },
  ];

  competencies.forEach((comp, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.35 + col * 6.55;
    const y = 1.35 + row * 1.9;

    slide.addShape(prs.ShapeType.rect, { x, y, w: 6.25, h: 1.7, fill: { color: LIGHT_GRAY }, line: { color: MID_GRAY, width: 0.5 } });
    slide.addShape(prs.ShapeType.rect, { x, y, w: 0.08, h: 1.7, fill: { color: RED } });
    slide.addText(comp.title, { x: x + 0.2, y: y + 0.12, w: 5.9, h: 0.4, fontSize: 14, bold: true, color: DARK, fontFace: 'Calibri' });
    slide.addText(comp.desc, { x: x + 0.2, y: y + 0.55, w: 5.9, h: 1.0, fontSize: 11.5, color: '#444444', fontFace: 'Calibri', wrap: true });
  });
}

// ─────────────────────────────────────────────
// SLIDE 5 — KEY ACHIEVEMENTS
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  addSlideHeader(slide, 'Key Achievements', 'Delivering Measurable Impact');

  const achievements = [
    { metric: '[X]%', label: 'Revenue Growth', desc: 'Grew regional sales by [X]% YoY through strategic channel expansion' },
    { metric: '[X]K', label: 'Clients Served', desc: 'Managed portfolio of [X,000]+ clients with [Y]% retention rate' },
    { metric: '#[X]', label: 'Team Ranking', desc: 'Led team to top [X] ranking nationally within [Y] months' },
    { metric: '[X]M', label: 'AUM / Revenue', desc: 'Achieved $[X]M in new business / assets under management' },
  ];

  achievements.forEach((a, i) => {
    const x = 0.35 + i * 3.2;
    // Card
    slide.addShape(prs.ShapeType.rect, { x, y: 1.4, w: 3.0, h: 4.0, fill: { color: DARK }, line: { color: RED, width: 1.5 } });
    // Top red accent
    slide.addShape(prs.ShapeType.rect, { x, y: 1.4, w: 3.0, h: 0.1, fill: { color: RED } });
    // Metric
    slide.addText(a.metric, { x: x + 0.1, y: 1.7, w: 2.8, h: 1.1, align: 'center', fontSize: 38, bold: true, color: RED, fontFace: 'Calibri' });
    // Label
    slide.addText(a.label, { x: x + 0.1, y: 2.8, w: 2.8, h: 0.45, align: 'center', fontSize: 13, bold: true, color: GOLD, fontFace: 'Calibri' });
    // Divider
    slide.addShape(prs.ShapeType.line, { x: x + 0.3, y: 3.3, w: 2.4, h: 0, line: { color: MID_GRAY, width: 0.5 } });
    // Description
    slide.addText(a.desc, { x: x + 0.15, y: 3.45, w: 2.7, h: 1.7, align: 'center', fontSize: 11, color: '#CCCCCC', fontFace: 'Calibri', wrap: true });
  });
}

// ─────────────────────────────────────────────
// SLIDE 6 — WHY AIA
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  addSlideHeader(slide, 'Why AIA?', 'My Motivation to Join the AIA Family');

  // Left column — Why AIA
  slide.addShape(prs.ShapeType.rect, { x: 0.35, y: 1.35, w: 6.2, h: 5.75, fill: { color: LIGHT_GRAY }, line: { color: MID_GRAY, width: 0.5 } });
  slide.addShape(prs.ShapeType.rect, { x: 0.35, y: 1.35, w: 6.2, h: 0.45, fill: { color: RED } });
  slide.addText('What Draws Me to AIA', { x: 0.5, y: 1.38, w: 5.9, h: 0.38, fontSize: 14, bold: true, color: WHITE, fontFace: 'Calibri' });

  const whyAIA = [
    "Asia's largest independent listed life insurer — a platform of genuine scale and influence",
    "AIA's purpose-led culture: 'Healthier, Longer, Better Lives' resonates deeply with my values",
    'Robust product suite enabling holistic financial protection solutions for clients',
    'Market leadership and strong brand equity across 18 markets',
    'Commitment to digital transformation and innovation in insurance',
    "AIA One Billion — a bold ambition that I want to be part of",
  ];
  addBullets(slide, whyAIA, 0.5, 1.9, 5.9, 5.0, { fontSize: 12 });

  // Right column — What I bring
  slide.addShape(prs.ShapeType.rect, { x: 6.8, y: 1.35, w: 6.2, h: 5.75, fill: { color: DARK }, line: { color: RED, width: 0.5 } });
  slide.addShape(prs.ShapeType.rect, { x: 6.8, y: 1.35, w: 6.2, h: 0.45, fill: { color: GOLD } });
  slide.addText('What I Bring to AIA', { x: 6.95, y: 1.38, w: 5.9, h: 0.38, fontSize: 14, bold: true, color: DARK, fontFace: 'Calibri' });

  const whatIBring = [
    '[X] years of proven [industry] expertise directly applicable to this role',
    'Strong existing network of clients / agents / partners in [market/region]',
    'Track record of building high-performing teams and driving growth',
    'Deep understanding of customer needs in protection and wealth planning',
    "Energy and ambition aligned with AIA's growth trajectory",
  ];
  addBullets(slide, whatIBring, 6.95, 1.9, 5.9, 5.0, { fontSize: 12, color: WHITE });
}

// ─────────────────────────────────────────────
// SLIDE 7 — 90-DAY PLAN / VALUE PROPOSITION
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  addSlideHeader(slide, 'My 90-Day Plan', 'How I Will Hit the Ground Running');

  const phases = [
    {
      phase: 'Days 1–30', label: 'Learn & Listen', color: DARK,
      items: ['Deep-dive into AIA products, systems, and processes', 'Build relationships with team, stakeholders, and key clients', 'Understand current challenges and opportunities in the role'],
    },
    {
      phase: 'Days 31–60', label: 'Plan & Engage', color: '#8B0000',
      items: ['Identify quick wins and develop an action plan', 'Begin active client / agent engagement', 'Align strategy with team and management'],
    },
    {
      phase: 'Days 61–90', label: 'Execute & Deliver', color: RED,
      items: ['Drive measurable outcomes toward KPIs', 'Establish rhythm of business and accountability', 'Present initial results and 6-month roadmap'],
    },
  ];

  phases.forEach((p, i) => {
    const x = 0.35 + i * 4.3;
    slide.addShape(prs.ShapeType.rect, { x, y: 1.4, w: 4.05, h: 5.7, fill: { color: LIGHT_GRAY }, line: { color: MID_GRAY, width: 0.5 } });
    slide.addShape(prs.ShapeType.rect, { x, y: 1.4, w: 4.05, h: 0.55, fill: { color: p.color } });
    slide.addText(p.phase, { x: x + 0.1, y: 1.42, w: 3.85, h: 0.3, fontSize: 11, bold: true, color: WHITE, fontFace: 'Calibri' });
    slide.addText(p.label, { x: x + 0.1, y: 1.7, w: 3.85, h: 0.3, fontSize: 13, bold: true, color: WHITE, fontFace: 'Calibri' });
    addBullets(slide, p.items, x + 0.1, 2.1, 3.85, 4.8, { fontSize: 12 });
  });
}

// ─────────────────────────────────────────────
// SLIDE 8 — CLOSING / THANK YOU
// ─────────────────────────────────────────────
{
  const slide = prs.addSlide();
  // Full dark background
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK } });
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: '100%', fill: { color: RED } });
  slide.addShape(prs.ShapeType.rect, { x: 0, y: 7.3, w: '100%', h: 0.2, fill: { color: RED } });
  slide.addShape(prs.ShapeType.rect, { x: 0.35, y: 3.5, w: 12.98, h: 0.05, fill: { color: GOLD } });

  slide.addText('Thank You', {
    x: 0.6, y: 1.2, w: 12, h: 1.2,
    fontSize: 52, bold: true, color: WHITE, fontFace: 'Calibri',
  });
  slide.addText('I look forward to contributing to AIA\'s mission of\nhelping people live Healthier, Longer, Better Lives.', {
    x: 0.6, y: 2.5, w: 11, h: 1.0,
    fontSize: 18, color: GOLD, italic: true, fontFace: 'Calibri',
  });

  // Contact info
  slide.addText('[Your Name]', { x: 0.6, y: 3.8, w: 11, h: 0.5, fontSize: 20, bold: true, color: WHITE, fontFace: 'Calibri' });
  slide.addText('📧  [your.email@email.com]', { x: 0.6, y: 4.35, w: 11, h: 0.4, fontSize: 14, color: MID_GRAY, fontFace: 'Calibri' });
  slide.addText('📱  [+XX XXXX XXXX]', { x: 0.6, y: 4.75, w: 11, h: 0.4, fontSize: 14, color: MID_GRAY, fontFace: 'Calibri' });
  slide.addText('🔗  linkedin.com/in/[your-profile]', { x: 0.6, y: 5.15, w: 11, h: 0.4, fontSize: 14, color: MID_GRAY, fontFace: 'Calibri' });

  slide.addText('AIA Group Limited', { x: 0.6, y: 6.5, w: 12, h: 0.5, fontSize: 13, color: RED, bold: true, fontFace: 'Calibri' });
}

// ─────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────
await prs.writeFile({ fileName: 'AIA_Interview_Presentation.pptx' });
console.log('✅  AIA_Interview_Presentation.pptx created successfully!');
