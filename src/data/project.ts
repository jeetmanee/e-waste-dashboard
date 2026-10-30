import type { OrganisationRecord, SourceRecord } from '../types';

export const categories = [
  { slug: 'generation', number: '01', title: 'Generation & inventory', short: 'Generation', description: 'Reported quantities, inventory definitions and district-level data.', status: 'Reported values · definition unresolved' },
  { slug: 'collection', number: '02', title: 'Collection performance', short: 'Collection', description: 'Directory-listed collection connections and evidence of service coverage.', status: 'Directory leads · verification pending' },
  { slug: 'recycling', number: '03', title: 'Formal recycling & treatment', short: 'Recycling', description: 'Authorisation, processing capacity, treatment and downstream records.', status: 'Insufficient data' },
  { slug: 'compliance', number: '04', title: 'Regulatory compliance', short: 'Compliance', description: 'EPR, regulatory records, inspections and enforcement evidence.', status: 'Primary documents required' },
  { slug: 'informal-sector', number: '05', title: 'Informal sector integration', short: 'Informal sector', description: 'Informal collection networks, workers and potential formalisation routes.', status: 'Research not yet recorded' },
  { slug: 'environment', number: '06', title: 'Environmental & health safeguards', short: 'Environmental safeguards', description: 'Monitoring, safe storage, worker health and environmental controls.', status: 'Insufficient data' },
  { slug: 'awareness', number: '07', title: 'Awareness & outreach', short: 'Awareness', description: 'Programmes, workshops and public-disposal guidance records.', status: 'No activities recorded' },
];

export const expectedSubmissions = [
  { title: 'IEEE Paper Submission Folder', folder: true },
  { title: 'Case Study Report Submission' },
  { title: 'LEED Certificate Rating System of Green Building in India' },
  { title: 'E waste Campaign Documents_Class Activity' },
  { title: 'Companies Following E waste Rules In India' },
  { title: 'E waste Recovery Process description_Suggest Changes' },
  { title: 'E waste_Comparison of Rules of Different Countries' },
  { title: 'Novel Ideas for E waste_PPT Submission for Pitch deck' },
  { title: 'Carbon Foot Print Tacker data Upload' },
  { title: 'State wise_ E Waste tracker_PPT' },
  { title: 'E waste India Scenario_Comparison' },
  { title: 'Assignment_ZERO' },
  { title: 'Assignment 1_E Waste Tracker by excel' },
] as const;

export const reportedQuantities = [
  { financialYear: 'FY 2023–24', value: 4.76207, label: '4.76207 MT' },
  { financialYear: 'FY 2024–25', value: 15.61187, label: '15.61187 MT' },
];

export const sources: SourceRecord[] = [
  {
    id: 'source-npcb-eiacp', title: 'NPCB EIACP Newsletter · Vol. 9, Issue 4', publisher: 'Nagaland Pollution Control Board (NPCB)', source_type: 'Official publication',
    url: 'https://npcb.nagaland.gov.in/wp-content/uploads/EIACP-Newsletter-Vol-9-Issue-No-4-Oct-Dec-2025.pdf',
    publication_date: 'Oct–Dec 2025', accessed_date: null,
    description: 'The newsletter labels the FY 2023–24 and FY 2024–25 figures as “Total Quantity of E-Waste collected”. The original publication should be retained for verification.',
    findings: 'Reported quantities: 4.76207 MT for FY 2023–24 and 15.61187 MT for FY 2024–25.', category: 'generation', verification_status: 'Pending verification', visibility: 'public'
  },
  {
    id: 'source-cpcb-ngt', title: 'CPCB report filed before the National Green Tribunal', publisher: 'Central Pollution Control Board (CPCB)', source_type: 'Government report',
    url: 'https://www.greentribunal.gov.in/sites/default/files/news_updates/Report%20on%20behalf%20of%20CPCB%20in%20EA%20NO%2004%20of%202024%20IN%20OA%20No.%20512%20of%202018%20%28Shailesh%20Singh%20Vs.%20State%20of%20U.P.%20%26%20Ors.%29.pdf',
    publication_date: null, accessed_date: null,
    description: 'The same values appear in a CPCB report table using generation terminology. Reconcile with NPCB before defining a generation or collection rate.',
    findings: 'The terminology is not aligned with the NPCB newsletter.', category: 'generation', verification_status: 'Pending verification', visibility: 'public'
  },
  {
    id: 'source-pib-recyclers', title: 'State-wise registered recycler table', publisher: 'MoEFCC / Press Information Bureau', source_type: 'Government publication',
    url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2147876&lang=2&reg=48',
    publication_date: '2025', accessed_date: null,
    description: 'The cited state-wise table for FY 2023–24 and FY 2024–25 does not list Nagaland. This is a narrow table-specific finding, not proof that no collection or out-of-state treatment routes exist.',
    findings: 'Nagaland is not listed in the cited state-wise registered recycler table.', category: 'recycling', verification_status: 'Pending verification', visibility: 'public'
  },
  {
    id: 'source-mepl', title: 'MEPL e-waste collection directory', publisher: 'MEPL / E-Circle listing', source_type: 'Industry directory',
    url: 'https://mepl.store/pages/e-waste', publication_date: null, accessed_date: null,
    description: 'Lists a Dimapur “Own Collection Centre”. Directory listing does not independently establish current operating status or recycler authorisation.',
    findings: 'House 93, C Khel, Diphupara, Dimapur, Nagaland 797001. Listed contact: Soweteu K. Letro, 7005811236; contact@ecircle2018.com.', category: 'collection', verification_status: 'Pending verification', visibility: 'public'
  },
  {
    id: 'source-think-recycling', title: 'Think Recycling EPR / collection directory', publisher: 'Think Recycling', source_type: 'Industry directory',
    url: 'https://www.thinkrecycling.in/epr', publication_date: null, accessed_date: null,
    description: 'Lists collection connections in Kohima and Dimapur. These entries should be verified before directing bulk waste.',
    findings: 'Kohima: H-90, Civil Secretariat. Dimapur: Plot-1, Industrial Area, Circular Road. Listed helpline: 1800-572-1009.', category: 'collection', verification_status: 'Pending verification', visibility: 'public'
  },
];

export const organisations: OrganisationRecord[] = [
  {
    id: 'org-mepl-ecircle', name: 'MEPL / E-Circle', organisation_type: 'Directory-listed collection connection', location: 'Dimapur',
    address: 'House 93, C Khel, Diphupara, Dimapur, Nagaland 797001', contact_name: 'Soweteu K. Letro', phone: '7005811236', email: 'contact@ecircle2018.com',
    website: 'https://mepl.store/pages/e-waste', description: 'MEPL’s e-waste page lists an “Own Collection Centre” in Dimapur. Operating status and downstream route require independent verification.', verification_status: 'Pending verification', visibility: 'public'
  },
  {
    id: 'org-think-kohima', name: 'Think Recycling', organisation_type: 'Directory-listed collection connection', location: 'Kohima',
    address: 'H-90, Civil Secretariat, Kohima, Nagaland 797004', contact_name: null, phone: '1800-572-1009', email: null, website: 'https://www.thinkrecycling.in/epr',
    description: 'A Kohima collection point is listed in the Think Recycling EPR directory. Current operating status and accepted categories are not independently verified.', verification_status: 'Pending verification', visibility: 'public'
  },
  {
    id: 'org-think-dimapur', name: 'Think Recycling', organisation_type: 'Directory-listed collection connection', location: 'Dimapur',
    address: 'Plot-1, Industrial Area, Circular Road, Dimapur, Nagaland 797112', contact_name: null, phone: '1800-572-1009', email: null, website: 'https://www.thinkrecycling.in/epr',
    description: 'A Dimapur collection point is listed in the Think Recycling EPR directory. Current operating status and accepted categories are not independently verified.', verification_status: 'Pending verification', visibility: 'public'
  },
];

export const initialDeliverables = [
  'State-wise e-waste tracker', 'E-waste scorecard', 'Company directory', 'Research report', 'Excel workbooks', 'Presentations', 'Documentation', 'Final submission', 'Supporting material'
];

export const categoryDetails: Record<string, { intro: string; findings: string[]; gaps: string[]; next: string[] }> = {
  generation: {
    intro: 'The two latest published values show a substantial increase, but the source terminology must be reconciled before treating them as a confirmed generation or collection series.',
    findings: ['FY 2023–24: 4.76207 MT reported quantity.', 'FY 2024–25: 15.61187 MT reported quantity.', 'Approximate increase: 227.8% year-on-year, or 3.28×.'],
    gaps: ['District-wise quantities and methodology are not available.', 'Category-wise equipment/material split is not verified.', 'Per-capita figure is not calculated.'],
    next: ['Obtain written clarification from NPCB on the quantity definition.', 'Request the original year-wise and district-wise reporting basis.', 'Define the minimum inventory template before adding future data.']
  },
  collection: {
    intro: 'Published directories identify three collection connections across Kohima and Dimapur. Listings are leads for verification, not evidence of current operating performance.',
    findings: ['MEPL / E-Circle lists an “Own Collection Centre” in Dimapur.', 'Think Recycling lists collection points in Kohima and Dimapur.'],
    gaps: ['Statewide collected tonnage and collection rate are not established.', 'Accepted categories, operating status and service coverage require confirmation.', 'Downstream handover records and EPR target achievement are not verified.'],
    next: ['Verify each listed point directly.', 'Record service areas, accepted categories and monthly receipts.', 'Collect handover records and destination details.']
  },
  recycling: {
    intro: 'The available directory entries concern collection connections. They do not establish an authorised recycling plant operating within Nagaland.',
    findings: ['Nagaland is not listed in the cited MoEFCC / PIB state-wise registered recycler table for FY 2023–24 and FY 2024–25.', 'This does not establish the absence of out-of-state routes or aggregation.'],
    gaps: ['Installed in-state authorised capacity is not verified.', 'Quantity processed and material recovery rate are not available.', 'Recycling certificates and downstream destinations are not provided.'],
    next: ['Check the current CPCB registered recycler database.', 'Trace the destinations used by directory-listed collection connections.', 'Request recycler authorisation and processing evidence.']
  },
  compliance: {
    intro: 'The E-Waste (Management) Rules, 2022 provide the regulatory baseline. The sources reviewed do not establish Nagaland-specific counts for registrations, inspections or enforcement outcomes.',
    findings: ['The rules are a reference framework, not evidence of entity-level compliance.', 'No primary state compliance register was supplied in the reviewed materials.'],
    gaps: ['EPR registrations and producer/entity coverage are not verified.', 'Inspection totals, notices and penalties are not available.', 'Authorised downstream handovers are not verified.'],
    next: ['Attach the primary rules and relevant NPCB reporting.', 'Request inspection and enforcement records.', 'Establish an auditable compliance register.']
  },
  'informal-sector': {
    intro: 'The informal-sector baseline is not yet established. This is a research gap, not evidence that informal activity is absent.',
    findings: ['No verified state-wide hotspot or workforce baseline was identified in the reviewed sources.'],
    gaps: ['Scrap clusters and collection/trading networks are not mapped.', 'Worker counts, working conditions and training are not available.', 'Formal integration arrangements are not documented.'],
    next: ['Start with secondary research and a consent-based mapping plan.', 'Use anonymised, non-sensitive observation records.', 'Identify potential safe-handover and training pathways.']
  },
  environment: {
    intro: 'A documented baseline is needed before drawing conclusions about site conditions, worker health or environmental outcomes.',
    findings: ['No state-wide dataset for monitoring sites, sampling results or worker health screening was established from the reviewed sources.'],
    gaps: ['Air and soil monitoring locations/results are not available.', 'Worker health-screening records are not available.', 'Storage, segregation and hazardous-handling inspections are not verified.'],
    next: ['Define monitoring sites, dates, sampling methods and responsible agencies.', 'Use anonymised, appropriately authorised health records.', 'Document safe storage, PPE and residue routes.']
  },
  awareness: {
    intro: 'Outreach effectiveness cannot be measured without documented programme, audience and outcome records.',
    findings: ['No consolidated state-wide awareness campaign count or participant reach was established from the reviewed sources.'],
    gaps: ['Campaigns, participants and institutions covered are not available.', 'Collection generated through outreach is not measured.', 'Programme dates, locations and outcomes need documentation.'],
    next: ['Create a campaign register.', 'Record event, location, audience, attendance and supporting evidence.', 'Track any collection or follow-up action separately from awareness reach.']
  },
};
