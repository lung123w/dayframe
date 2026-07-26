/**
 * Statement abbreviations used by the user to identify monthly statements
 * when saving them to disk. Sourced from
 * `OneDrive/0. Box/Abbreviation of statements.pdf` (the user's own mapping).
 *
 * Two groups:
 *   - 'personal': Emily's individual accounts / credit cards
 *   - 'family':   Emily & Anderson's joint family accounts
 *
 * Each entry has the human-readable statement name (as it appears in the
 * bank statement), the file-name prefix the user uses to save the PDF, and
 * an optional note for the human-readable meaning.
 */
export const ABBREVIATION_GROUPS = [
  {
    id: 'personal',
    title: 'Personal',
    intro: "Emily's individual accounts, credit cards, and recurring monthly bills.",
    items: [
      { statement: 'Hang Seng Bank Integrated Account', abbr: 'hsb_ia_jan19' },
      { statement: 'Hang Seng Bank Credit Card', abbr: 'hsb_cc_jan19' },
      { statement: 'HSBC One Account', abbr: 'hsbc_ia_one_nov24' },
      { statement: 'HSBC Credit Card', abbr: 'hsbc_cc_jan19' },
      { statement: 'HSBC RED', abbr: 'hsbc_cc_red_jan21' },
      { statement: 'HSBC Sign (hsbd_sign)', abbr: 'hsbc_cc_sign_jul21' },
      { statement: 'HSBC EveryMile', abbr: 'hsbc_cc_mile_may24' },
      { statement: 'Citi Bank Credit Card', abbr: 'citi_cc_may19' },
      { statement: 'Citi Bank Credit Card (Rewards)', abbr: 'citi_cc__rewards may19' },
      { statement: 'DBS Bank Credit Card', abbr: 'dbs_cc_jan19' },
      { statement: 'Standard Chartered Credit Card', abbr: 'sc_cc_jan19' },
      { statement: 'Standard Chartered Credit Card — Simply Cash', abbr: 'sc_cc_sic_jan19' },
      { statement: 'Standard Chartered Credit Card — Smart', abbr: 'sc_cc_sm_oct22' },
      { statement: 'BOC Credit Card', abbr: 'boc_cc_apr19' },
      { statement: 'Aeon Credit Card', abbr: 'aeon_cc_dec19' },
      { statement: 'BEA Credit Card (World Master)', abbr: 'bea_cc_wm_nov21' },
      { statement: 'BEA Credit Card (Titanium)', abbr: 'bea_cc_t_nov21' },
      { statement: 'I-access monthly statement', abbr: 'iaccess_m_jan19' },
      { statement: 'I-access daily statement', abbr: 'iaccess_30jan19' },
      { statement: 'HKBN monthly statement', abbr: 'hkbn_jan19' },
      { statement: 'TSFS demand note', abbr: 'tsfs_jan19' },
      { statement: 'Nonmean demand note', abbr: 'non_mean_may25' },
      { statement: 'OOCL Salary pay slip', abbr: 'oocl_payslip_feb19' },
      { statement: 'Manulife MPF', abbr: 'manulife_mpf_mar19' },
      { statement: 'Sofi Investment', abbr: 'sofi_22jul20' },
    ],
  },
  {
    id: 'family',
    title: "Emily & Anderson's New Family Account",
    intro: 'Joint family accounts, household utilities, and the M Power card.',
    items: [
      { statement: 'Hang Seng M Power', abbr: 'fam_hsb_m_power_dec_23' },
      { statement: 'Hang Seng Bank Joint Account', abbr: 'fam_hsb_joint_dec_24' },
      { statement: 'CLP', abbr: 'fam_clp_feb24' },
      { statement: 'TOWNGAS', abbr: 'towngas_apr24' },
      { statement: 'Water Supplies Department', abbr: 'wsd_sep25' },
    ],
  },
];
