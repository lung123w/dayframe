import { getLastSaturdayOfMonth, currentMonthKey } from './lastSaturday.js';

/**
 * Source-of-truth checklist for the monthly financial review,
 * mirrored from the user's PDF (`每月財務管理`).
 *
 * Each section is a category, each item is one checkbox row.
 * The `id` is the textual key used to seed a stable per-review item id
 * (combined with the monthKey at build time).
 */
export const MONTHLY_REVIEW_TEMPLATE = [
  {
    section: 'Personal Finance',
    items: [
      { key: 'pf-1', text: 'Download monthly statements for all banks, student aid office, and internet bills; save in the standard folder structure' },
      { key: 'pf-2', text: 'Compare each bank statement against Money Pro data and reconcile any differences' },
      { key: 'pf-3a', text: 'Write down each credit card\u2019s final payment due date and amount in the notes' },
      { key: 'pf-3b', text: 'Adjust Money Pro balances if discrepancies were found' },
      { key: 'pf-4', text: 'After verifying the data, pay the bills via PPS' },
      { key: 'pf-5', text: 'Record the PPS payment instructions in Money Pro (Bill Schedule)' },
      { key: 'pf-6', text: 'Count current wallets and e-wallets; record latest balance in Money Pro' },
      { key: 'pf-7a', text: 'Calculate tithe amount (Tithe = Salary \u2212 270)' },
      { key: 'pf-7b', text: 'Save tithe receipt to the computer' },
      { key: 'pf-7c', text: 'Upload the tithe receipt to the church website', link: 'https://www.yanfook.org.hk/offering' },
      { key: 'pf-8', text: 'Process the monthly CSL mobile internet and HKBN internet bills' },
    ],
  },
  {
    section: 'Family Finance',
    items: [
      { key: 'ff-1', text: 'Process new family expenses including electricity, gas, and internet' },
      { key: 'ff-2', text: 'Process the new family M POWER credit card payment' },
      { key: 'ff-3', text: 'Transfer funds to the family bank account' },
    ],
  },
  {
    section: 'Loan Processing',
    items: [
      { key: 'lp-1', text: 'Arrange auto-repayment transfers' },
    ],
  },
  {
    section: 'Bond Cash Flow',
    items: [
      { key: 'bc-1', text: 'Download the IB monthly statement as of the financial review date' },
      { key: 'bc-2', text: 'Update relevant transaction records in the IB Investment App (new DCA instruments and new transactions)' },
      { key: 'bc-3', text: 'Update last month\u2019s bond interest income in Money Pro' },
      { key: 'bc-4', text: 'Transfer HKD 20,000 from Hang Seng to IB' },
    ],
  },
  {
    section: 'Credit Rating',
    items: [
      { key: 'cr-1', text: 'Check the monthly credit rating and verify any improvement' },
    ],
  },
];

let __idCounter = 0;
function genId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  __idCounter += 1;
  return `${prefix}-${Date.now()}-${__idCounter}`;
}

/**
 * Build a full review object for the given month, pre-populated from
 * the standard template plus empty card entries for every active card.
 *
 * @param {string} [monthKey] - YYYY-MM (defaults to current month)
 * @param {Date}   [now]      - reference date (defaults to new Date())
 * @param {Array<{id:number,name:string,institution:string,accountNumber:string}>} [activeCards]
 * @returns {{
 *   monthKey: string,
 *   year: number,
 *   month: number,
 *   reviewDate: string,
 *   status: string,
 *   checklist: Array<{id:string,text:string,section:string,order:number,completed:boolean,completedAt:null}>,
 *   cardEntries: Array<object>,
 *   completedAt: null
 * }}
 */
export function buildReviewFromTemplate(monthKey, now = new Date(), activeCards = []) {
  const key = monthKey || currentMonthKey(now);
  const [yStr, mStr] = key.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const reviewDate = getLastSaturdayOfMonth(year, month).toISOString();

  const checklist = [];
  MONTHLY_REVIEW_TEMPLATE.forEach((section) => {
    section.items.forEach((item, idx) => {
      checklist.push({
        id: genId(`cl-${key}-${item.key}`),
        key: item.key,
        text: item.text,
        section: section.section,
        order: idx,
        completed: false,
        completedAt: null,
      });
    });
  });

  const cardEntries = activeCards.map((c) => ({
    cardId: c.id,
    cardName: c.name,
    cardInstitution: c.institution,
    accountNumber: c.accountNumber,
    statementSaved: false,
    amount: '',
    dueDate: '',
    moneyProVerified: false,
    ppsSetUp: false,
    moneyProRecorded: false,
    notes: '',
  }));

  return {
    monthKey: key,
    year,
    month: month + 1,
    reviewDate,
    status: 'pending',
    checklist,
    cardEntries,
    completedAt: null,
  };
}
