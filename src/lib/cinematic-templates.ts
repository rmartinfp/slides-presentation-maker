import { CinematicSlideType } from '@/types/cinematic';

/**
 * A cinematic template defines the STRUCTURE of a presentation:
 * how many slides, what type each is, and what content slots to fill.
 * The VISUAL STYLE comes from the CinematicPreset selected by the user.
 */
export interface CinematicSlideTemplate {
  type: CinematicSlideType;
  titlePlaceholder: string;
  subtitlePlaceholder?: string;
  bodyPlaceholder?: string;
  stats?: { value: string; label: string }[];
}

export interface CinematicTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  slideCount: number;
  slides: CinematicSlideTemplate[];
}

export const CINEMATIC_TEMPLATES: CinematicTemplate[] = [
  {
    id: 'pitch-deck',
    name: 'Startup Pitch',
    category: 'Business',
    description: '10 slides — Problem, solution, market, traction, team, ask',
    slideCount: 10,
    slides: [
      { type: 'hero', titlePlaceholder: 'Company Name', subtitlePlaceholder: 'One-line description of what you do' },
      { type: 'statement', titlePlaceholder: 'The world has a problem that costs $X billion every year' },
      { type: 'content', titlePlaceholder: 'Our Solution', bodyPlaceholder: 'A clear explanation of how your product solves the problem in a way nobody else does.' },
      { type: 'stats', titlePlaceholder: 'Traction', stats: [{ value: '10K+', label: 'Active Users' }, { value: '$1.2M', label: 'Annual Revenue' }, { value: '94%', label: 'Retention Rate' }] },
      { type: 'content', titlePlaceholder: 'Market Opportunity', bodyPlaceholder: 'The total addressable market is $X billion, growing at Y% per year. We target the Z segment first.' },
      { type: 'content', titlePlaceholder: 'Business Model', bodyPlaceholder: 'SaaS subscription with three tiers. Average contract value is $X/year with 120% net revenue retention.' },
      { type: 'stats', titlePlaceholder: 'Financial Projections', stats: [{ value: '$5M', label: 'Year 1 Revenue' }, { value: '$18M', label: 'Year 2 Revenue' }, { value: '$45M', label: 'Year 3 Revenue' }] },
      { type: 'content', titlePlaceholder: 'Competitive Advantage', bodyPlaceholder: 'Three key differentiators that create a defensible moat: proprietary technology, network effects, and data advantage.' },
      { type: 'section', titlePlaceholder: 'The Team' },
      { type: 'closing', titlePlaceholder: 'The Ask', subtitlePlaceholder: 'Raising $X to achieve Y milestone in Z months' },
    ],
  },
  {
    id: 'quarterly-review',
    name: 'Quarterly Report',
    category: 'Corporate',
    description: '8 slides — Results, metrics, highlights, outlook',
    slideCount: 8,
    slides: [
      { type: 'hero', titlePlaceholder: 'Q4 2025 Review', subtitlePlaceholder: 'Performance Report & Strategic Outlook' },
      { type: 'stats', titlePlaceholder: 'Key Metrics', stats: [{ value: '$2.4M', label: 'Revenue' }, { value: '+24%', label: 'Growth YoY' }, { value: '127', label: 'New Clients' }] },
      { type: 'content', titlePlaceholder: 'Revenue Analysis', bodyPlaceholder: 'Revenue grew 24% year-over-year driven by enterprise segment expansion and improved pricing strategy.' },
      { type: 'content', titlePlaceholder: 'Product Highlights', bodyPlaceholder: 'Launched 3 major features, reduced churn by 18%, and expanded to 2 new markets.' },
      { type: 'stats', titlePlaceholder: 'Customer Satisfaction', stats: [{ value: '94%', label: 'NPS Score' }, { value: '4.8/5', label: 'Avg Rating' }, { value: '-30%', label: 'Support Tickets' }] },
      { type: 'content', titlePlaceholder: 'Challenges & Learnings', bodyPlaceholder: 'Key challenges faced and how the team adapted to overcome them during the quarter.' },
      { type: 'content', titlePlaceholder: 'Q1 Priorities', bodyPlaceholder: 'Three strategic priorities for the coming quarter: expand enterprise, launch mobile, and improve retention.' },
      { type: 'closing', titlePlaceholder: 'Thank You', subtitlePlaceholder: 'Questions?' },
    ],
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'Marketing',
    description: '8 slides — Announce, demo, features, pricing, CTA',
    slideCount: 8,
    slides: [
      { type: 'hero', titlePlaceholder: 'Introducing Product Name', subtitlePlaceholder: 'The future of [category] is here' },
      { type: 'statement', titlePlaceholder: 'Built for teams who refuse to settle for less' },
      { type: 'content', titlePlaceholder: 'What It Does', bodyPlaceholder: 'A clear, compelling explanation of the core value proposition in 2-3 sentences.' },
      { type: 'stats', titlePlaceholder: 'By the Numbers', stats: [{ value: '10x', label: 'Faster' }, { value: '50%', label: 'Cost Reduction' }, { value: '0', label: 'Learning Curve' }] },
      { type: 'content', titlePlaceholder: 'Key Features', bodyPlaceholder: 'The three most important features that differentiate this product from alternatives.' },
      { type: 'content', titlePlaceholder: 'How It Works', bodyPlaceholder: 'Step-by-step walkthrough of the core user journey from signup to first value.' },
      { type: 'content', titlePlaceholder: 'Pricing', bodyPlaceholder: 'Simple, transparent pricing with a free tier to get started. Pro at $X/mo, Enterprise custom.' },
      { type: 'closing', titlePlaceholder: 'Get Started Today', subtitlePlaceholder: 'yourproduct.com/signup' },
    ],
  },
  {
    id: 'keynote',
    name: 'Keynote Speech',
    category: 'Speaking',
    description: '7 slides — Story arc for a conference talk',
    slideCount: 7,
    slides: [
      { type: 'hero', titlePlaceholder: 'The Title of Your Talk', subtitlePlaceholder: 'Your Name — Conference 2026' },
      { type: 'statement', titlePlaceholder: 'A provocative opening statement that grabs attention' },
      { type: 'content', titlePlaceholder: 'The Context', bodyPlaceholder: 'Set the stage: what is changing in the world that makes this topic urgent and relevant right now.' },
      { type: 'content', titlePlaceholder: 'The Insight', bodyPlaceholder: 'The core idea or framework that the audience should take away from this talk.' },
      { type: 'content', titlePlaceholder: 'The Evidence', bodyPlaceholder: 'Data, case studies, or stories that prove the insight is real and actionable.' },
      { type: 'content', titlePlaceholder: 'The Implication', bodyPlaceholder: 'What this means for the audience. How should they think or act differently after hearing this.' },
      { type: 'closing', titlePlaceholder: 'One Line They Will Remember', subtitlePlaceholder: '@yourhandle' },
    ],
  },
  {
    id: 'sales-deck',
    name: 'Sales Deck',
    category: 'Sales',
    description: '9 slides — Problem, solution, proof, pricing, close',
    slideCount: 9,
    slides: [
      { type: 'hero', titlePlaceholder: 'Product Name', subtitlePlaceholder: 'For [ideal customer] who need [outcome]' },
      { type: 'content', titlePlaceholder: 'The Challenge', bodyPlaceholder: 'Your prospects are spending too much time on X, losing money on Y, and struggling with Z.' },
      { type: 'statement', titlePlaceholder: 'There is a better way' },
      { type: 'content', titlePlaceholder: 'How We Help', bodyPlaceholder: 'Our platform automates the entire process, giving your team back 10+ hours per week.' },
      { type: 'stats', titlePlaceholder: 'Results Our Clients See', stats: [{ value: '3x', label: 'Productivity' }, { value: '-60%', label: 'Manual Work' }, { value: '< 30 days', label: 'Time to Value' }] },
      { type: 'content', titlePlaceholder: 'Case Study', bodyPlaceholder: 'Company X implemented our solution and achieved Y results in Z months. Here is how they did it.' },
      { type: 'content', titlePlaceholder: 'How It Works', bodyPlaceholder: 'Three simple steps: Connect your data, configure your workflows, and see results in days.' },
      { type: 'content', titlePlaceholder: 'Investment', bodyPlaceholder: 'Plans starting at $X/month. Volume discounts available. No long-term commitment required.' },
      { type: 'closing', titlePlaceholder: 'Let\'s Get Started', subtitlePlaceholder: 'Book a demo: calendly.com/yourteam' },
    ],
  },
  {
    id: 'project-update',
    name: 'Project Update',
    category: 'Internal',
    description: '6 slides — Status, progress, blockers, next steps',
    slideCount: 6,
    slides: [
      { type: 'hero', titlePlaceholder: 'Project Name Update', subtitlePlaceholder: 'Sprint Review — Week of March 24' },
      { type: 'stats', titlePlaceholder: 'Sprint Progress', stats: [{ value: '87%', label: 'Tasks Complete' }, { value: '12', label: 'Stories Shipped' }, { value: '3', label: 'Bugs Remaining' }] },
      { type: 'content', titlePlaceholder: 'What We Shipped', bodyPlaceholder: 'Summary of the key deliverables completed this sprint and their impact.' },
      { type: 'content', titlePlaceholder: 'Blockers & Risks', bodyPlaceholder: 'Current blockers that need escalation and risks to the timeline.' },
      { type: 'content', titlePlaceholder: 'Next Sprint Goals', bodyPlaceholder: 'The top 3 priorities for the next sprint and expected outcomes.' },
      { type: 'closing', titlePlaceholder: 'Questions?', subtitlePlaceholder: 'Open discussion' },
    ],
  },
];

export function getCinematicTemplateById(id: string): CinematicTemplate | undefined {
  return CINEMATIC_TEMPLATES.find(t => t.id === id);
}
