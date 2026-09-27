// Statement series table — the machine rules behind the statement-filing job.
//
// Transcribed from `openspec/changes/finance-review-statement-filing/design.md`
// §D4 (routing rule + roots) and §F1/F2/F3 (the classification rulebook frozen by
// card t_35e193a0). Do not re-derive any of it here: F1 is the SERIES table, F2 the
// content signatures, F3 the statement-month rules. Nothing in this file reads the
// filesystem or the environment.
//
// Routing rule (owner, verbatim): A-A & E Family\Statement\<YEAR>\ receives ONLY
// CLP, Towngas and MM Power; everything else goes to A-Finance\statement\<YEAR>\.

export const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Inbox — the folder the owner drops downloaded statements into. */
export const BOX_ROOT = 'C:\\Users\\user\\OneDrive\\0. Box';

/** Destination roots (D4, no trailing separator). */
export const DESTINATIONS = {
  finance: { id: 'finance', root: 'C:\\Users\\user\\OneDrive\\2. Area\\A-Finance\\statement' },
  ae: { id: 'ae', root: 'C:\\Users\\user\\OneDrive\\2. Area\\A-A & E Family\\Statement' },
};

/** D10 resolution order: DAYFRAME_PDFTOTEXT → this absolute path → `pdftotext` on PATH. */
export const PDFTOTEXT_DEFAULT = 'C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe';

/**
 * The A&E allow-list (D4/F1). Every SERIES row whose id is in this list MUST carry
 * destination 'ae'; every other row MUST carry 'finance'. A unit test asserts both
 * directions so the rule cannot drift into two contradictory places.
 */
export const SERIES_TO_AE = ['fam_clp', 'towngas', 'fam_hsb_m_power'];

// ---------------------------------------------------------------------------
// name patterns
//
// Canonical name (F1): `<id>_<mon><yy>.pdf`, mon lower case, yy = two-digit year of
// the statement month, matched case-insensitively. Every Tier-1 regex below has
// group 1 = month token, group 2 = two-digit year.
// ---------------------------------------------------------------------------

const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)';

// F1's canonical template takes `<yy>` = "the two-digit year of the statement month",
// but the owner's names also use the same trailing position for a day-of-save suffix:
// F5 rules `FIN\2026\hsb_ia_aug30.pdf` a *name variant* of August 2026, not a 2030
// statement. The corpus runs 2015-2026, so a trailing value of 30 or more is a day,
// never a year: such a name matches no Tier-1 pattern and falls through to the content
// tier (which files it as `<series>_aug26.pdf`). Nothing here reads the clock.
const MAX_YEAR_TOKEN = 29;

/** `^<id>_<mon><yy>\.pdf$` — the one rule that applies to every series (F1). */
function canonicalNamePattern(id) {
  return new RegExp(`^${id}_${MON}(\\d{2})\\.pdf$`, 'i');
}

/** An extra accepted name form from F1's last column. */
function extraNamePattern(source) {
  return new RegExp(source, 'i');
}

// ---------------------------------------------------------------------------
// content signatures (F2) and statement-month rules (F3)
//
// Signatures are plain CASE-SENSITIVE substrings of `pdftotext -enc UTF-8 -layout`
// output (F0.3.4: do not lower-case either side). `exclude` is the additive
// clarification that separates the two live false positives.
//
// Month rule: { mode: 'first-date', pattern } = first match anywhere in the text;
//            { mode: 'anchor', literal, pattern, window } = first match of `pattern`
//            within `window` characters after the first occurrence of `literal`
//            (default window 400).
// ---------------------------------------------------------------------------

const anchor = (literal, pattern, window = 400) => ({ mode: 'anchor', literal, pattern, window });
const firstDate = (pattern) => ({ mode: 'first-date', pattern });

const HSB_CC_MONTH = /\d{1,2} [A-Z]{3} \d{4}/; // 21 SEP 2026
const HSBC_STATEMENT_MONTH = /\d{2} [A-Z]{3} \d{4}/; // 16 SEP 2026

/**
 * SERIES — 33 rows, in F1 table order (Group A content-identifiable, Group B/C/D
 * filename-only). Order is the content-match order frozen by D5/F2: the first row
 * whose signatures all match and whose signatures are not excluded wins.
 *
 * `recognise` is the destination-side prefix list (F1): longest prefix first, which
 * is what keeps `fam_hsb_joint_*` out of the `fam_hsb_*` alias.
 */
export const SERIES = [
  // ---- Group A — content-identifiable -------------------------------------
  {
    id: 'fam_hsb_m_power',
    destination: 'ae',
    label: 'Hang Seng M Power credit card',
    recognise: ['fam_hsb_m_power', 'am_hsb_m_power', 'fam_hsb'],
    names: [
      canonicalNamePattern('fam_hsb_m_power'),
      extraNamePattern(`^fam_hsb_${MON}(\\d{2})\\.pdf$`),
      extraNamePattern(`^am_hsb_m_power_${MON}(\\d{2})(?:_\\d+)?\\.pdf$`),
    ],
    content: { require: ['MMPOWER WORLD MC', 'HANG SENG BANK', 'CLOSING DATE'], exclude: [] },
    month: anchor('CLOSING DATE', HSB_CC_MONTH),
  },
  {
    id: 'fam_clp',
    destination: 'ae',
    label: 'CLP electricity bill',
    recognise: ['fam_clp'],
    names: [canonicalNamePattern('fam_clp'), extraNamePattern(`^fam_clp_f${MON}(\\d{2})\\.pdf$`)],
    content: { require: ['住宅用電', '發單日期'], exclude: [] },
    month: anchor('發單日期', /\d{2}-\d{2}-\d{2}/),
  },
  {
    id: 'boc_cc',
    destination: 'finance',
    label: 'BOC credit card',
    recognise: ['boc_cc'],
    names: [canonicalNamePattern('boc_cc')],
    content: { require: ['月結單', 'MONTHLY STATEMENT', '中銀'], exclude: ['CNCBI'] },
    month: firstDate(/\d{2}-[A-Z]{3}-\d{4}/),
  },
  {
    id: 'citi_cc',
    destination: 'finance',
    label: 'Citibank credit card',
    recognise: ['citi_cc'],
    names: [canonicalNamePattern('citi_cc')],
    content: { require: ['CITIBANK'], exclude: [] },
    month: firstDate(/[A-Z][a-z]+ \d{2}, \d{4}/),
  },
  {
    id: 'hsb_cc',
    destination: 'finance',
    label: 'Hang Seng credit card',
    recognise: ['hsb_cc'],
    names: [canonicalNamePattern('hsb_cc')],
    content: { require: ['HANG SENG BANK', 'CLOSING DATE'], exclude: ['MMPOWER'] },
    month: anchor('CLOSING DATE', HSB_CC_MONTH),
  },
  {
    id: 'hsb_ia',
    destination: 'finance',
    label: 'Hang Seng Integrated Account (personal)',
    recognise: ['hsb_ia'],
    names: [canonicalNamePattern('hsb_ia')],
    content: { require: ['CHINESE UNIVERSITY (290)', 'Integrated Account'], exclude: [] },
    month: firstDate(/\d{1,2} [A-Z][a-z]{2} \d{4}/),
  },
  {
    id: 'hsbc_cc_red',
    destination: 'finance',
    label: 'HSBC Red credit card',
    recognise: ['hsbc_cc_red'],
    names: [canonicalNamePattern('hsbc_cc_red')],
    content: { require: ['Statement of HSBC Red Credit Card Account'], exclude: [] },
    month: anchor('Statement date', HSBC_STATEMENT_MONTH),
  },
  {
    id: 'hsbc_cc_sign',
    destination: 'finance',
    label: 'HSBC Visa Signature credit card',
    recognise: ['hsbc_cc_sign'],
    names: [canonicalNamePattern('hsbc_cc_sign')],
    content: { require: ['HSBC VISA SIGNATURE CARD ACCOUNT'], exclude: [] },
    month: anchor('Statement date', HSBC_STATEMENT_MONTH),
  },
  {
    id: 'hsbc_cc_mile',
    destination: 'finance',
    label: 'HSBC EveryMile credit card',
    recognise: ['hsbc_cc_mile'],
    names: [canonicalNamePattern('hsbc_cc_mile')],
    content: { require: ['EveryMile Credit Card Account'], exclude: [] },
    month: anchor('Statement date', HSBC_STATEMENT_MONTH),
  },
  {
    id: 'hsbc_ia_one',
    destination: 'finance',
    label: 'HSBC One account',
    recognise: ['hsbc_ia_one'],
    names: [canonicalNamePattern('hsbc_ia_one')],
    content: { require: ['HSBC One Portfolio'], exclude: [] },
    month: firstDate(/\d{1,2} [A-Z][a-z]+ \d{4}/),
  },
  {
    id: 'fam_hsb_joint',
    destination: 'finance',
    label: 'Hang Seng joint account (Emily & Anderson)',
    recognise: ['fam_hsb_joint'],
    names: [canonicalNamePattern('fam_hsb_joint')],
    content: { require: ['SHATIN (246)', 'Integrated Account'], exclude: [] },
    month: firstDate(/\d{1,2} [A-Z][a-z]{2} \d{4}/),
  },
  {
    id: 'wsd',
    destination: 'finance',
    label: 'Water Supplies Department demand note',
    recognise: ['wsd'],
    names: [canonicalNamePattern('wsd')],
    content: { require: ['水務署', 'Water Supplies Department', '付款通知書'], exclude: [] },
    month: anchor('發出日期', /\d{2}\/\d{2}\/\d{4}/, 60),
  },
  {
    id: 'citic',
    destination: 'finance',
    label: 'CNCBI (CITIC) credit card',
    recognise: ['citic'],
    names: [canonicalNamePattern('citic')],
    content: { require: ['CNCBI', 'MONTHLY STATEMENT'], exclude: [] },
    month: firstDate(/\d{2} [A-Z]{3} \d{4}/),
  },
  {
    id: 'bea_cc_wm',
    destination: 'finance',
    label: 'BEA World MasterCard',
    recognise: ['bea_cc_wm'],
    names: [canonicalNamePattern('bea_cc_wm')],
    content: { require: ['WORLD MASTERCARD'], exclude: [] },
    month: firstDate(/\d{1,2} [A-Z]{3} \d{4}/),
  },
  {
    id: 'bea_cc_t',
    destination: 'finance',
    label: 'BEA Titanium MasterCard',
    recognise: ['bea_cc_t'],
    names: [canonicalNamePattern('bea_cc_t')],
    content: { require: ['TITANIUM MASTERCARD'], exclude: [] },
    month: firstDate(/\d{1,2} [A-Z]{3} \d{4}/),
  },
  {
    id: 'wewa',
    destination: 'finance',
    label: 'WeWa credit card',
    recognise: ['wewa'],
    names: [canonicalNamePattern('wewa')],
    content: { require: ['WEWA DIAMOND CARD'], exclude: [] },
    month: anchor('月結單截數日', /\d{2} [A-Z][a-z]{2} \d{4}/),
  },

  // ---- Group B — filename-only: no text layer ------------------------------
  {
    id: 'towngas',
    destination: 'ae',
    label: 'Towngas bill',
    recognise: ['towngas'],
    names: [canonicalNamePattern('towngas')],
    content: null,
    month: null,
  },
  {
    id: 'oocl_payslip',
    destination: 'finance',
    label: 'OOCL salary pay slip',
    recognise: ['oocl_payslip'],
    names: [canonicalNamePattern('oocl_payslip')],
    content: null,
    month: null,
  },

  // ---- Group C — filename-only: content cannot discriminate the series -----
  {
    id: 'tithe',
    destination: 'finance',
    label: 'Tithe transfer receipt (Yan Fook)',
    recognise: ['tithe'],
    names: [canonicalNamePattern('tithe')],
    content: null,
    month: null,
  },
  {
    id: 'tsfs',
    destination: 'finance',
    label: 'TSFS transfer receipt (Yan Fook)',
    recognise: ['tsfs'],
    names: [canonicalNamePattern('tsfs')],
    content: null,
    month: null,
  },
  {
    id: 'citi_cc_rewards',
    destination: 'finance',
    label: 'Citibank rewards credit card',
    recognise: ['citi_cc_rewards', 'citi_cc__rewards'],
    names: [
      canonicalNamePattern('citi_cc_rewards'),
      extraNamePattern(`^citi_cc__rewards[ _-]?${MON}(\\d{2})(?:[_ -]\\d+)?\\.pdf$`),
    ],
    content: null,
    month: null,
  },
  {
    id: 'non_mean',
    destination: 'finance',
    label: 'Non-mean demand note',
    recognise: ['non_mean'],
    names: [canonicalNamePattern('non_mean')],
    content: null,
    month: null,
  },

  // ---- Group D — dormant legacy rows (no file after 2021) ------------------
  { id: 'hsbc_cc', destination: 'finance', label: 'HSBC credit card', recognise: ['hsbc_cc'], names: [canonicalNamePattern('hsbc_cc')], content: null, month: null },
  { id: 'sc_cc', destination: 'finance', label: 'Standard Chartered credit card', recognise: ['sc_cc'], names: [canonicalNamePattern('sc_cc')], content: null, month: null },
  { id: 'sc_cc_sic', destination: 'finance', label: 'Standard Chartered SIC credit card', recognise: ['sc_cc_sic'], names: [canonicalNamePattern('sc_cc_sic')], content: null, month: null },
  { id: 'sc_cc_sm', destination: 'finance', label: 'Standard Chartered Smart credit card', recognise: ['sc_cc_sm'], names: [canonicalNamePattern('sc_cc_sm')], content: null, month: null },
  { id: 'dbs_cc', destination: 'finance', label: 'DBS credit card', recognise: ['dbs_cc'], names: [canonicalNamePattern('dbs_cc')], content: null, month: null },
  { id: 'aeon_cc', destination: 'finance', label: 'AEON credit card', recognise: ['aeon_cc'], names: [canonicalNamePattern('aeon_cc')], content: null, month: null },
  { id: 'hkbn', destination: 'finance', label: 'HKBN bill', recognise: ['hkbn'], names: [canonicalNamePattern('hkbn')], content: null, month: null },
  { id: 'manulife_mpf', destination: 'finance', label: 'Manulife MPF statement', recognise: ['manulife_mpf'], names: [canonicalNamePattern('manulife_mpf')], content: null, month: null },
  { id: 'oocl_salary', destination: 'finance', label: 'OOCL salary statement', recognise: ['oocl_salary'], names: [canonicalNamePattern('oocl_salary')], content: null, month: null },
  { id: 'iaccess_m', destination: 'finance', label: 'iAccess statement', recognise: ['iaccess_m'], names: [canonicalNamePattern('iaccess_m')], content: null, month: null },
  { id: 'sofi', destination: 'finance', label: 'SoFi statement', recognise: ['sofi'], names: [canonicalNamePattern('sofi')], content: null, month: null },
];

/** `boc_cc` + `2026-09` → `boc_cc_sep26.pdf` (F1 canonical form). */
export function canonicalFileName(seriesId, statementMonth) {
  const [year, month] = statementMonth.split('-');
  return `${seriesId}_${MONTH_KEYS[Number(month) - 1]}${year.slice(-2)}.pdf`;
}

/**
 * Destination-side series recognition reads the file NAME only (F0.3.3). The longest
 * matching `recognise` prefix wins, so `fam_hsb_joint_*` is not swallowed by the
 * `fam_hsb_*` alias of `fam_hsb_m_power`.
 */
export function seriesByRecognisePrefix(name) {
  const lower = name.toLowerCase();
  let best = null;
  let bestLength = 0;
  for (const series of SERIES) {
    for (const prefix of series.recognise) {
      if (prefix.length > bestLength && lower.startsWith(prefix.toLowerCase())) {
        best = series;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/** Index of the first month token in a file name, or -1. */
export function monthIndexInName(name) {
  const match = name.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  return match ? MONTH_KEYS.indexOf(match[1].toLowerCase()) : -1;
}

/** Tier 1: the first SERIES row whose name patterns match, with its statement month. */
export function matchSeriesByName(name) {
  for (const series of SERIES) {
    for (const pattern of series.names) {
      const match = name.match(pattern);
      if (!match) continue;
      if (Number(match[2]) > MAX_YEAR_TOKEN) continue; // a day-of-save suffix, not a year (F5)
      return { series, statementMonth: `${2000 + Number(match[2])}-${String(MONTH_KEYS.indexOf(match[1].toLowerCase()) + 1).padStart(2, '0')}` };
    }
  }
  return null;
}
