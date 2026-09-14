export const person = {
  name: 'Aryan Basantani',
  email: 'aryanbasantani1729@gmail.com',
  linkedin: 'https://www.linkedin.com/in/aryanbasantani',
  x: 'https://x.com/arbs_42',
  description: 'Product, technology and finance. Enterprise software, financial workflows, independent builds and analytical work by Aryan Basantani.',
};

// Entries represent approved work boundaries. Features and responsibilities belong
// inside their parent experience; do not turn every bullet into a new project.
export const experience = [
  { company: 'MoveInSync', role: 'Associate Product Consultant', dates: 'May 2024 – Sep 2025', summary: 'Product and analytics for a new manufacturing transport vertical.', detail: 'Worked with customers and engineers on transport workflows, safety and attendance logic, reporting, and operational tools. A flagship client deployment established the analytics suite. Rapid prototypes—including a custom vendor-billing workflow—helped move implementation forward.', href: '/work/moveinsync-analytics/' },
  { company: 'JPMorgan Chase', role: 'Product Intern · Wholesale credit risk', dates: 'Jul – Dec 2023', summary: 'Reporting automation and product work on an internal credit-risk platform.', detail: 'Worked with credit officers on financial-statement models, portfolio migration, onboarding and support. Contributed testing for monthly releases alongside the reporting automation.', href: '/work/credit-risk-workflows/' },
  { company: 'Kearney', role: 'Associated Consultant', dates: 'Sep 2025 – Mar 2026', summary: 'Enterprise technology strategy for an Indian oil and gas organisation.', detail: 'Supported information-systems diagnostics, application-modernisation and cyber-risk analysis for an Indian oil and gas organisation. The work combined benchmarking with stakeholder recommendations for enterprise technology decisions.' },
  { company: 'Americana Foods', role: 'Junior Analyst · Business intelligence', dates: 'May – Jul 2022', summary: 'Digital analytics using Python, Power BI, and Google Analytics.', detail: 'Performed exploratory analysis of key datasets after discussions with management about its business-intelligence needs. The work used Python, Power BI, and Google Analytics to turn those questions into usable views of the available data.' },
];

export type Story = {
  slug: string; title: string; organisation: string; kind: string; year: string;
  deck: string; role: string; summary: string; decision: string; outcome: string;
  evidence: string; visual: string; selected?: boolean;
  details: { title: string; text: string }[]; source: string; link?: string;
};
export const stories: Story[] = [
  {
    slug: 'moveinsync-analytics', title: 'One analytics suite for three transport products', organisation: 'MoveInSync', kind: 'Employer work', year: '2024–2025', selected: true, visual: 'analytics',
    deck: 'Making operational numbers consistent, explainable, and useful.',
    role: 'Product ownership, customer discovery, SQL reporting and delivery',
    summary: 'Manufacturing customers used ETS Cab, Shuttle, and Rentlz, but their analytics lived in a separate catalogue of 100+ similarly named reports. Dashboard totals did not always agree with reports, and low performance numbers were hard to explain.',
    decision: 'I brought the three offerings into a dedicated suite for the vertical. Every metric needed a consistent definition and a drilldown to the individual records behind it.',
    outcome: 'The flagship client deployment established the suite, which reached 10+ enterprise customers on web and mobile. Operations teams could investigate low performance figures and improve data and operating practices. The clearer journey also helped demos and conversion.',
    evidence: 'Customer reach is documented in my résumé. The decision, maintenance trade-off, and customer response come from my first-hand account. Demo and conversion improvements are qualitative.',
    details: [
      { title: 'Why a dedicated suite?', text: 'ETS Cab handled dynamically routed home-to-office and office-to-home travel. Shuttle used fixed routes; Rentlz covered ad-hoc pickup and drop. Customers needed a shared operational view across these offerings, without finding their way through a general-purpose report catalogue.' },
      { title: 'The trade-off: consistency takes maintenance', text: 'Keeping the dashboard, reports and drilldowns aligned was extra work. I chose that investment because customers needed to trust the numbers before using them to change their operations. Low figures became useful once a team could trace them to specific records.' },
      { title: 'From a mismatch to something operations could use', text: 'The first customer problem was that dashboard metrics did not always match the reports, while low performance figures offered no route back to the underlying cause. In the dedicated suite, teams could follow a metric down to individual records, then improve data and operating practices with a clearer view of resource use.' },
      { title: 'The broader product work', text: 'The same manufacturing role included safety, attendance and distance logic, customer investigations, and Python/JavaScript utilities. A custom vendor-billing prototype was an example of shipping quickly around a platform gap. These were parts of the employer work, rather than separate portfolio projects.' },
      { title: 'The internal investigation tool', text: 'For the manufacturing vertical, I connected Jira, Amazon Redshift tables, and policy documentation via MCP. An LLM could query this context to help debug client feature flags and track engineering tickets.' },
    ],
    source: 'My project account and product/finance résumés. The diagram explains the information journey; it is not a product screenshot. Customer names and internal records are omitted.',
  },
  {
    slug: 'shubh-bazaar', title: 'Shubh Bazaar: from storefront to fulfilment', organisation: 'Independent work', kind: 'Freelance / side project', year: 'Live', selected: true, visual: 'commerce',
    deck: 'Building the commerce flow end to end, including the parts behind checkout.',
    role: 'End-to-end product design and development, with AI assistance',
    summary: 'I built a commerce platform covering the catalogue, product variants, inventory, checkout, payments, and order management. This was a side/freelance project I owned myself, with AI assistance.',
    decision: 'I treated payment verification and shipment booking as separate workflows, so a fulfilment retry would not undo a successful payment.',
    outcome: 'The site is live, with PhonePe payments, Shiprocket fulfilment, product administration, and customer tracking. This case describes the implementation; it makes no sales or customer-volume claim.',
    evidence: 'The project code includes server-side payment reconciliation, shipment booking, caching, administration, checkout and tracking. The artwork and code excerpt on this page come from the project.',
    details: [
      { title: 'Make payment status dependable', text: 'A gateway completion must match the stored amount. Once payment is recorded as paid, subsequent checks preserve that state. Shipment booking requires confirmed payment and records failures for retry.' },
      { title: 'Work through the operational details', text: 'The implementation includes inventory and variants, an administration area, map-based address selection, storefront caching, and tracking. It combines React/TypeScript, Supabase/Postgres, Cloudflare R2, and external APIs.' },
      { title: 'What I took from it', text: 'My main lessons were in system design, caching, shipping quickly, and owning the complete experience. Getting a page working was one step; making the flows behind it consistent took more thought.' },
    ],
    source: 'My project clarification and supplied implementation. The artwork is a storefront asset, not a screenshot of a live order. The payment system has not been independently audited for this portfolio.',
    link: 'https://shubhwholesalebazaar.com',
  },
  {
    slug: 'semiconductor-research', title: 'Semiconductors: industry, index, valuation', organisation: 'BITS Pilani · Coursework', kind: 'Academic group project', year: '2022', selected: true, visual: 'research',
    deck: 'Connecting business analysis with the financial models behind an investment view.',
    role: 'Group contributor · industry analysis, benchmarking and valuation',
    summary: 'Our coursework examined NVIDIA, Intel and AMD through industry structure, supply-chain dynamics, competitive positioning and valuation. The work connected company analysis with a semiconductor industry index.',
    decision: 'The group used an industry-to-company approach: study the sector, compare the businesses, build an index, and then develop valuation models. The index report contains 15 companies.',
    outcome: 'The team produced industry and company reports, index/risk analysis, and valuation workbooks. These are historical academic outputs, not current investment recommendations.',
    evidence: 'The original December 2022 index report lists five contributors, including me, and documents the 15-constituent index, regression analysis, implied equity risk premium and cost of capital. The table below is a small excerpt from that report.',
    details: [
      { title: 'Start with the businesses', text: 'Industry and company analysis used frameworks including Porter’s Five Forces, BCG and SPACE analysis. NVIDIA, Intel and AMD were compared for competitive positioning before the valuation work.' },
      { title: 'Connect the index to valuation inputs', text: 'The index report examines systematic and unsystematic risk, implied equity risk premium, cost of equity and WACC. The archive also contains staged dividend-discount and cash-flow valuation workbooks.' },
      { title: 'Attribution and scope', text: 'This page describes the group’s output. I was a contributor; the individual division of work is not presented as sole ownership. The archive provides the methodology and historical context without claiming subsequent investment returns.' },
    ],
    source: 'ECON F355 group reports and valuation-workbook archive. Index report dated 25 December 2022. Table values are transcribed from the report and are not current market data. Personal contact details from the report cover are not reproduced.',
  },
  {
    slug: 'credit-risk-workflows', title: 'Automating a credit-reporting workflow', organisation: 'JPMorgan Chase', kind: 'Employer work · Internship', year: '2023', visual: 'credit',
    deck: 'Reducing repeated manual work while preserving the reporting output.',
    role: 'Product intern · portfolio reporting analysis and VBA automation',
    summary: 'Credit officers used an internal platform for financial spreading and credit-risk analysis. Portfolio reports and summaries still involved repeated manual processing.',
    decision: 'I analysed the reporting issues and built a VBA automation around the required output format.',
    outcome: 'The workflow reduced manual reporting effort by approximately 90%.',
    evidence: 'The wider role included portfolio migration, financial-statement models, support and release testing.',
    details: [
      { title: 'Understand the people using the output', text: 'Working with credit officers on product questions and onboarding helped me understand how the reporting fit their day-to-day analysis.' },
      { title: 'Automate the repeatable work, preserve the output', text: 'I analysed the reporting issues around the existing portfolio reports and kept the required output format intact. The VBA workflow automated the repeatable processing and reduced the manual reporting effort by approximately 90%.' },
      { title: 'Work around the workflow', text: 'The internship also included specialised portfolio migrations, work on financial-statement models, product onboarding and support, and monthly feature testing. KPI and regulatory-reporting support remained part of the role rather than separate portfolio projects.' },
    ],
    source: 'Product and finance résumés, career narrative, and my corrected ~90% figure. No bank records, screenshots, or customer information are published.',
  },
  {
    slug: 'fintech-planning', title: 'Financial-planning tools for a B2C startup', organisation: 'BITS Hyderabad Consulting Group', kind: 'Client engagement · Student consulting', year: '2022–2023', visual: 'planning',
    deck: 'Product and go-to-market work for people at different financial life stages.',
    role: 'Co-led a seven-member team · meeting coordination, technical design and delivery',
    summary: 'Our team worked with a B2C financial-planning startup serving users from first-time earners to pensioners. The engagement combined product design and go-to-market strategy.',
    decision: 'We translated the planning scope into a Goal Calculator and Risk Profiler. I co-led the team and owned meeting coordination, technical design and delivery.',
    outcome: 'The features went live on the client’s platform. No adoption or conversion figures are claimed.',
    evidence: 'The résumés identify the two tools and delivery to the client platform. Team size and my responsibilities were clarified directly for this portfolio.',
    details: [
      { title: 'Product and delivery together', text: 'The engagement joined feature definition with go-to-market recommendations. My ownership covered coordination, technical design and delivery; this does not imply I individually coded the complete client platform.' },
    ],
    source: 'Product and finance résumés and my direct clarification. Client identity is described anonymously by sector and product. No client-interface reproduction is included.',
  },
];

export type ProjectLibraryCategory = 'Product & Engineering' | 'Finance & Markets' | 'Research & Data';
export type Entry = { title: string; setting: string; text: string; tags: string[]; href?: string; libraryCategory?: ProjectLibraryCategory };
export const groups: { id: string; title: string; note: string; entries: Entry[] }[] = [
  { id: 'employer', title: 'Employer work', note: 'Defined pieces of work within my roles. Broader responsibilities live in Experience.', entries: [
    { title: 'Manufacturing transport analytics', setting: 'MoveInSync', text: 'A dedicated analytics suite for ETS Cab, Shuttle and Rentlz, established through a flagship client deployment.', tags: ['Product', 'SQL', 'Metabase'], href: '/work/moveinsync-analytics/' },
    { title: 'Credit-reporting automation', setting: 'JPMorgan Chase · Internship', text: 'VBA automation of a portfolio reporting workflow, reducing manual effort by approximately 90%.', tags: ['Financial systems', 'VBA'], href: '/work/credit-risk-workflows/' },
    { title: 'Manufacturing investigation assistant', setting: 'MoveInSync · Internal tool', text: 'Connected Jira, Amazon Redshift tables and policy documentation via MCP for LLM-assisted investigation of client feature flags and engineering tickets.', tags: ['MCP', 'Internal tools', 'Data'] },
  ]},
  { id: 'library', title: 'Project library', note: 'Side, freelance and academic projects, organised by the kind of problem rather than where I did the work.', entries: [
    { title: 'Shubh Bazaar', setting: 'Live · Side / freelance', text: 'Commerce platform built end to end with AI assistance: catalogue, inventory, payments and fulfilment.', tags: ['Full-stack', 'APIs', 'Caching'], href: '/work/shubh-bazaar/', libraryCategory: 'Product & Engineering' },
    { title: 'Semiconductor industry analysis & valuation', setting: 'Academic group project · 2022', text: 'NVIDIA, Intel and AMD analysis, a 15-company industry index, and staged valuation models.', tags: ['Equity research', 'Valuation'], href: '/work/semiconductor-research/', libraryCategory: 'Finance & Markets' },
    { title: 'Quantitative portfolio optimisation', setting: 'Academic project', text: '20 assets and 15,000+ simulated allocations; historical versus market-model covariance and constrained portfolio optimisation.', tags: ['Python', 'Portfolio theory'], libraryCategory: 'Finance & Markets' },
    { title: 'Time-series modelling & value at risk', setting: 'Academic project · 2023', text: 'CAPM, ARIMA, GARCH/EGARCH and VaR for Dabur and Jubilant FoodWorks. Report dated May 2023, using April 2021–March 2023 data.', tags: ['Risk', 'R', 'Python'], libraryCategory: 'Finance & Markets' },
    { title: 'Britannia derivatives strategies', setting: 'Academic group project · 2022', text: 'Options strategies examined through breakevens, margins and theoretical payoffs under different market expectations.', tags: ['Derivatives', 'Scenario analysis'], libraryCategory: 'Finance & Markets' },
    { title: 'Coal India dividend-policy analysis', setting: 'Corporate finance coursework', text: 'ROE, dividends, buybacks and FCFE examined using a dividend-policy matrix.', tags: ['Corporate finance', 'Analysis'], libraryCategory: 'Finance & Markets' },
    { title: 'Kitabazaar', setting: 'Academic team build', text: 'A campus book marketplace using Django and MySQL, with work on application design, the data model and frontend/backend collaboration.', tags: ['Django', 'MySQL'], libraryCategory: 'Product & Engineering' },
    { title: 'Vehicle Parking Management System', setting: 'Academic team build', text: 'Contribution to a Java/Spring Boot application with user, admin and driver workflows, booking and verification.', tags: ['Java', 'Spring Boot', 'MySQL'], libraryCategory: 'Product & Engineering' },
    { title: 'Polygon decomposition', setting: 'Academic implementation', text: 'C++ implementation of a polygon-decomposition paper, documented with Doxygen and analysed visually with Matplotlib.', tags: ['C++', 'Algorithms'], libraryCategory: 'Product & Engineering' },
    { title: 'Maze Path-Finder', setting: 'Academic build · 2022', text: 'A maze-generation game and solver using graph and data-structure concepts, displaying an algorithm-generated solution.', tags: ['Data structures', 'Algorithms'], libraryCategory: 'Product & Engineering' },
    { title: 'Targeted malaria intervention', setting: 'Academic research · Co-authored', text: 'Survey-data preparation and data mining to investigate household malaria risk and intervention needs.', tags: ['Data mining', 'Public health'], libraryCategory: 'Research & Data' },
    { title: 'Predictive wellness & blockchain healthcare', setting: 'Academic research', text: 'Literature review and initial methodology, evaluating K-means, Random Forest and MLP for wellness-score prediction.', tags: ['Machine learning', 'Research'], libraryCategory: 'Research & Data' },
  ]},
  { id: 'client', title: 'Client engagements', note: 'Student consulting through BHCG. Clients described by their product and sector.', entries: [
    { title: 'Financial-planning product & GTM', setting: 'B2C fintech startup · BHCG', text: 'Co-led seven people; owned meeting coordination, technical design and delivery for Goal Calculator and Risk Profiler work.', tags: ['Fintech', 'Product design', 'Delivery'], href: '/work/fintech-planning/' },
    { title: 'Edtech product & pricing', setting: 'Edtech startup · BHCG', text: 'Product and pricing redesign that informed the startup’s go-to-market and digital marketing efforts.', tags: ['Pricing', 'Product strategy', 'GTM'] },
  ]},
  { id: 'community', title: 'Community initiatives & publication', note: 'Building spaces and resources for other people to learn.', entries: [
    { title: 'ProdEezy', setting: 'Community initiative · BHCG', text: 'Launched on one campus and scaled to three, connecting 300+ students with 20+ product mentors.', tags: ['Mentorship', 'Community'] },
    { title: 'BlockSoc', setting: 'Community initiative · Founding team', text: 'Helped establish a student community for blockchain, digital assets and DeFi, with workshops and projects.', tags: ['Community', 'Blockchain'] },
    { title: 'BITS consulting casebook', setting: 'Co-authored publication', text: 'Contributed to the first BITS consulting casebook, a resource containing 60+ frameworks and case studies.', tags: ['Writing', 'Consulting'] },
    { title: 'Wall Street Club', setting: 'Community leadership · Secretary', text: 'Led a 90-member finance community. Launched Upside and worked on quantitative trading case studies, alongside workshops and competitions.', tags: ['Markets', 'Editorial', 'Community'] },
  ]},
  { id: 'teaching', title: 'Teaching', note: 'A standalone teaching entry, separate from the project categories.', entries: [
    { title: 'Finance & economics teaching', setting: 'Teaching assistant · BITS', text: 'Supported 650+ students in Economics and Derivatives through coursework, questions, assignment evaluation and course logistics.', tags: ['Teaching', 'Finance'] },
  ]},
];

// Add only real, finished personal entries. Empty arrays do not create filler UI.
export const personalEntries: { title: string; description: string; href: string; kind: string }[] = [];
