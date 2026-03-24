-- Seed cinematic templates into Supabase
-- Each template is a complete package: preset + slide structure + video per slide

INSERT INTO public.cinematic_templates (name, slug, category, description, preset_id, slides, thumbnail_url, tags, sort_order)
VALUES

-- 1. Startup Pitch — Dark & bold (Midnight preset)
(
  'Startup Pitch',
  'startup-pitch',
  'Business',
  'A 10-slide investor pitch deck with bold typography and dark abstract backgrounds.',
  'midnight',
  '[
    {"type":"hero","titlePlaceholder":"Company Name","subtitlePlaceholder":"One-line description of what you do","videoUrl":"https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4)"},
    {"type":"statement","titlePlaceholder":"The world has a $X billion problem","videoUrl":"https://videos.pexels.com/video-files/6981411/6981411-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"content","titlePlaceholder":"Our Solution","bodyPlaceholder":"A clear explanation of how your product solves the problem.","videoUrl":"https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"stats","titlePlaceholder":"Traction","stats":[{"value":"10K+","label":"Active Users"},{"value":"$1.2M","label":"Annual Revenue"},{"value":"94%","label":"Retention"}],"videoUrl":"https://videos.pexels.com/video-files/4625518/4625518-uhd_2560_1440_30fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.3)"},
    {"type":"content","titlePlaceholder":"Market Opportunity","bodyPlaceholder":"TAM is $X billion, growing at Y% per year.","videoUrl":"https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"content","titlePlaceholder":"Business Model","bodyPlaceholder":"SaaS subscription with 120% net revenue retention.","videoUrl":"https://videos.pexels.com/video-files/6981411/6981411-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"stats","titlePlaceholder":"Projections","stats":[{"value":"$5M","label":"Year 1"},{"value":"$18M","label":"Year 2"},{"value":"$45M","label":"Year 3"}],"videoUrl":"https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.3)"},
    {"type":"content","titlePlaceholder":"Competitive Advantage","bodyPlaceholder":"Three key differentiators that create a defensible moat.","videoUrl":"https://videos.pexels.com/video-files/4625518/4625518-uhd_2560_1440_30fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"section","titlePlaceholder":"The Team","videoUrl":"https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.3)"},
    {"type":"closing","titlePlaceholder":"The Ask","subtitlePlaceholder":"Raising $X for Y milestone","videoUrl":"https://videos.pexels.com/video-files/6981411/6981411-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.35)"}
  ]'::jsonb,
  NULL,
  ARRAY['pitch', 'startup', 'investor', 'funding'],
  1
),

-- 2. Quarterly Report — Corporate gradient (Aurora preset)
(
  'Quarterly Report',
  'quarterly-report',
  'Corporate',
  'An 8-slide quarterly performance review with ethereal gradient backgrounds.',
  'aurora',
  '[
    {"type":"hero","titlePlaceholder":"Q4 2025 Review","subtitlePlaceholder":"Performance Report & Strategic Outlook","videoUrl":"https://videos.pexels.com/video-files/5737731/5737731-uhd_2560_1440_25fps.mp4","videoOpacity":0.3,"videoFilter":"brightness(0.5) saturate(1.2)"},
    {"type":"stats","titlePlaceholder":"Key Metrics","stats":[{"value":"$2.4M","label":"Revenue"},{"value":"+24%","label":"Growth YoY"},{"value":"127","label":"New Clients"}],"videoUrl":"https://videos.pexels.com/video-files/4812203/4812203-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.4)"},
    {"type":"content","titlePlaceholder":"Revenue Analysis","bodyPlaceholder":"Revenue grew 24% driven by enterprise expansion.","videoUrl":"https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.45)"},
    {"type":"content","titlePlaceholder":"Product Highlights","bodyPlaceholder":"3 major features launched, churn reduced 18%.","videoUrl":"https://videos.pexels.com/video-files/6984162/6984162-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.45)"},
    {"type":"stats","titlePlaceholder":"Customer Satisfaction","stats":[{"value":"94%","label":"NPS Score"},{"value":"4.8/5","label":"Avg Rating"},{"value":"-30%","label":"Support Tickets"}],"videoUrl":"https://videos.pexels.com/video-files/5737731/5737731-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.4)"},
    {"type":"content","titlePlaceholder":"Challenges & Learnings","bodyPlaceholder":"Key challenges and how the team adapted.","videoUrl":"https://videos.pexels.com/video-files/4812203/4812203-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.45)"},
    {"type":"content","titlePlaceholder":"Q1 Priorities","bodyPlaceholder":"Three strategic priorities for next quarter.","videoUrl":"https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.45)"},
    {"type":"closing","titlePlaceholder":"Thank You","subtitlePlaceholder":"Questions?","videoUrl":"https://videos.pexels.com/video-files/6984162/6984162-uhd_2560_1440_25fps.mp4","videoOpacity":0.3,"videoFilter":"brightness(0.5)"}
  ]'::jsonb,
  NULL,
  ARRAY['quarterly', 'report', 'corporate', 'review'],
  2
),

-- 3. Product Launch — Neon cyberpunk (Neon preset)
(
  'Product Launch',
  'product-launch',
  'Marketing',
  'An 8-slide product announcement with vibrant neon tech backgrounds.',
  'neon',
  '[
    {"type":"hero","titlePlaceholder":"Introducing Product","subtitlePlaceholder":"The future is here","videoUrl":"https://videos.pexels.com/video-files/5532765/5532765-uhd_2560_1440_25fps.mp4","videoOpacity":0.3,"videoFilter":"brightness(0.4) saturate(1.3)"},
    {"type":"statement","titlePlaceholder":"Built for teams who refuse to settle","videoUrl":"https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.35) saturate(1.3)"},
    {"type":"content","titlePlaceholder":"What It Does","bodyPlaceholder":"Core value proposition in 2-3 sentences.","videoUrl":"https://videos.pexels.com/video-files/5532771/5532771-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4) saturate(1.2)"},
    {"type":"stats","titlePlaceholder":"By the Numbers","stats":[{"value":"10x","label":"Faster"},{"value":"50%","label":"Cost Reduction"},{"value":"0","label":"Learning Curve"}],"videoUrl":"https://videos.pexels.com/video-files/5532765/5532765-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35) saturate(1.2)"},
    {"type":"content","titlePlaceholder":"Key Features","bodyPlaceholder":"Three features that set us apart.","videoUrl":"https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4) saturate(1.2)"},
    {"type":"content","titlePlaceholder":"How It Works","bodyPlaceholder":"Step-by-step walkthrough.","videoUrl":"https://videos.pexels.com/video-files/5532771/5532771-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4) saturate(1.2)"},
    {"type":"content","titlePlaceholder":"Pricing","bodyPlaceholder":"Simple pricing with a free tier.","videoUrl":"https://videos.pexels.com/video-files/5532765/5532765-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4) saturate(1.2)"},
    {"type":"closing","titlePlaceholder":"Get Started Today","subtitlePlaceholder":"yourproduct.com","videoUrl":"https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4","videoOpacity":0.3,"videoFilter":"brightness(0.4) saturate(1.3)"}
  ]'::jsonb,
  NULL,
  ARRAY['product', 'launch', 'marketing', 'tech'],
  3
),

-- 4. Keynote — Editorial minimal (Editorial preset)
(
  'Keynote Speech',
  'keynote-speech',
  'Speaking',
  'A 7-slide keynote with elegant serif typography and subtle minimal backgrounds.',
  'editorial',
  '[
    {"type":"hero","titlePlaceholder":"Title of Your Talk","subtitlePlaceholder":"Your Name — Conference 2026","videoUrl":"https://videos.pexels.com/video-files/5377700/5377700-uhd_2560_1440_25fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.5)"},
    {"type":"statement","titlePlaceholder":"A provocative opening that grabs attention","videoUrl":"https://videos.pexels.com/video-files/4812197/4812197-uhd_2560_1440_25fps.mp4","videoOpacity":0.1,"videoFilter":"brightness(0.55)"},
    {"type":"content","titlePlaceholder":"The Context","bodyPlaceholder":"What is changing that makes this topic urgent.","videoUrl":"https://videos.pexels.com/video-files/4625502/4625502-uhd_2560_1440_30fps.mp4","videoOpacity":0.12,"videoFilter":"brightness(0.5)"},
    {"type":"content","titlePlaceholder":"The Insight","bodyPlaceholder":"The core idea the audience should take away.","videoUrl":"https://videos.pexels.com/video-files/5377700/5377700-uhd_2560_1440_25fps.mp4","videoOpacity":0.12,"videoFilter":"brightness(0.5)"},
    {"type":"content","titlePlaceholder":"The Evidence","bodyPlaceholder":"Data, case studies, or stories that prove it.","videoUrl":"https://videos.pexels.com/video-files/4812197/4812197-uhd_2560_1440_25fps.mp4","videoOpacity":0.12,"videoFilter":"brightness(0.5)"},
    {"type":"content","titlePlaceholder":"The Implication","bodyPlaceholder":"How should the audience think differently.","videoUrl":"https://videos.pexels.com/video-files/4625502/4625502-uhd_2560_1440_30fps.mp4","videoOpacity":0.12,"videoFilter":"brightness(0.5)"},
    {"type":"closing","titlePlaceholder":"One Line They Remember","subtitlePlaceholder":"@yourhandle","videoUrl":"https://videos.pexels.com/video-files/5377700/5377700-uhd_2560_1440_25fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.5)"}
  ]'::jsonb,
  NULL,
  ARRAY['keynote', 'speech', 'conference', 'talk'],
  4
),

-- 5. Sales Deck — Velocity fast-paced (Velocity preset)
(
  'Sales Deck',
  'sales-deck',
  'Sales',
  'A 9-slide sales deck with fast-paced animations and tech-inspired backgrounds.',
  'velocity',
  '[
    {"type":"hero","titlePlaceholder":"Product Name","subtitlePlaceholder":"For teams who need results","videoUrl":"https://videos.pexels.com/video-files/5532765/5532765-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4)"},
    {"type":"content","titlePlaceholder":"The Challenge","bodyPlaceholder":"Your prospects spend too much time on manual work.","videoUrl":"https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"statement","titlePlaceholder":"There is a better way","videoUrl":"https://videos.pexels.com/video-files/5532771/5532771-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"content","titlePlaceholder":"How We Help","bodyPlaceholder":"Our platform gives your team back 10+ hours per week.","videoUrl":"https://videos.pexels.com/video-files/5532765/5532765-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"stats","titlePlaceholder":"Client Results","stats":[{"value":"3x","label":"Productivity"},{"value":"-60%","label":"Manual Work"},{"value":"<30d","label":"Time to Value"}],"videoUrl":"https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.3)"},
    {"type":"content","titlePlaceholder":"Case Study","bodyPlaceholder":"Company X achieved Y results in Z months.","videoUrl":"https://videos.pexels.com/video-files/5532771/5532771-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"content","titlePlaceholder":"How It Works","bodyPlaceholder":"Three steps: Connect, Configure, Results.","videoUrl":"https://videos.pexels.com/video-files/5532765/5532765-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"content","titlePlaceholder":"Investment","bodyPlaceholder":"Starting at $X/month. No long-term commitment.","videoUrl":"https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"closing","titlePlaceholder":"Let''s Get Started","subtitlePlaceholder":"Book a demo","videoUrl":"https://videos.pexels.com/video-files/5532771/5532771-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4)"}
  ]'::jsonb,
  NULL,
  ARRAY['sales', 'deck', 'enterprise', 'b2b'],
  5
),

-- 6. Project Update — Obsidian dark (Obsidian preset)
(
  'Project Update',
  'project-update',
  'Internal',
  'A 6-slide sprint review with cosmic dark backgrounds.',
  'obsidian',
  '[
    {"type":"hero","titlePlaceholder":"Project Update","subtitlePlaceholder":"Sprint Review — Week of March 24","videoUrl":"https://videos.pexels.com/video-files/1851190/1851190-uhd_2560_1440_24fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"stats","titlePlaceholder":"Sprint Progress","stats":[{"value":"87%","label":"Complete"},{"value":"12","label":"Shipped"},{"value":"3","label":"Bugs Left"}],"videoUrl":"https://videos.pexels.com/video-files/3194277/3194277-uhd_2560_1440_30fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.3)"},
    {"type":"content","titlePlaceholder":"What We Shipped","bodyPlaceholder":"Summary of key deliverables this sprint.","videoUrl":"https://videos.pexels.com/video-files/4588052/4588052-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"content","titlePlaceholder":"Blockers & Risks","bodyPlaceholder":"Current blockers that need escalation.","videoUrl":"https://videos.pexels.com/video-files/1851190/1851190-uhd_2560_1440_24fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"content","titlePlaceholder":"Next Sprint Goals","bodyPlaceholder":"Top 3 priorities for next sprint.","videoUrl":"https://videos.pexels.com/video-files/3194277/3194277-uhd_2560_1440_30fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"},
    {"type":"closing","titlePlaceholder":"Questions?","subtitlePlaceholder":"Open discussion","videoUrl":"https://videos.pexels.com/video-files/4588052/4588052-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.35)"}
  ]'::jsonb,
  NULL,
  ARRAY['project', 'sprint', 'agile', 'update'],
  6
),

-- 7. Company Overview — Prism colorful (Prism preset)
(
  'Company Overview',
  'company-overview',
  'Business',
  'An 8-slide company introduction with colorful gradient backgrounds.',
  'prism',
  '[
    {"type":"hero","titlePlaceholder":"Company Name","subtitlePlaceholder":"Building the future of [industry]","videoUrl":"https://videos.pexels.com/video-files/5737731/5737731-uhd_2560_1440_25fps.mp4","videoOpacity":0.3,"videoFilter":"brightness(0.45) saturate(1.3)"},
    {"type":"content","titlePlaceholder":"Who We Are","bodyPlaceholder":"A brief introduction to our mission and values.","videoUrl":"https://videos.pexels.com/video-files/4812203/4812203-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.4) saturate(1.2)"},
    {"type":"content","titlePlaceholder":"What We Do","bodyPlaceholder":"Our core products and services explained.","videoUrl":"https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.45) saturate(1.2)"},
    {"type":"stats","titlePlaceholder":"By the Numbers","stats":[{"value":"500+","label":"Clients"},{"value":"45","label":"Countries"},{"value":"98%","label":"Satisfaction"}],"videoUrl":"https://videos.pexels.com/video-files/6984162/6984162-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.4) saturate(1.2)"},
    {"type":"content","titlePlaceholder":"Our Values","bodyPlaceholder":"The principles that guide everything we do.","videoUrl":"https://videos.pexels.com/video-files/5737731/5737731-uhd_2560_1440_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.45) saturate(1.2)"},
    {"type":"section","titlePlaceholder":"Our Team","videoUrl":"https://videos.pexels.com/video-files/4812203/4812203-uhd_2560_1440_25fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.4) saturate(1.2)"},
    {"type":"content","titlePlaceholder":"Our Clients","bodyPlaceholder":"Trusted by leading organizations worldwide.","videoUrl":"https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_25fps.mp4","videoOpacity":0.25,"videoFilter":"brightness(0.45) saturate(1.2)"},
    {"type":"closing","titlePlaceholder":"Let''s Connect","subtitlePlaceholder":"hello@company.com","videoUrl":"https://videos.pexels.com/video-files/6984162/6984162-uhd_2560_1440_25fps.mp4","videoOpacity":0.3,"videoFilter":"brightness(0.45) saturate(1.3)"}
  ]'::jsonb,
  NULL,
  ARRAY['company', 'overview', 'introduction', 'about'],
  7
),

-- 8. Annual Review — Monochrome elegant (Monochrome preset)
(
  'Annual Review',
  'annual-review',
  'Corporate',
  'A 9-slide annual review with black & white corporate elegance.',
  'monochrome',
  '[
    {"type":"hero","titlePlaceholder":"2025 Annual Review","subtitlePlaceholder":"A Year of Growth & Innovation","videoUrl":"https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.4) grayscale(100%)"},
    {"type":"stats","titlePlaceholder":"Year in Numbers","stats":[{"value":"$12M","label":"Revenue"},{"value":"+85%","label":"Growth"},{"value":"200+","label":"Team"}],"videoUrl":"https://videos.pexels.com/video-files/3191572/3191572-uhd_2560_1440_25fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.35) grayscale(100%)"},
    {"type":"content","titlePlaceholder":"Strategic Wins","bodyPlaceholder":"The major achievements that defined our year.","videoUrl":"https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4","videoOpacity":0.18,"videoFilter":"brightness(0.4) grayscale(100%)"},
    {"type":"content","titlePlaceholder":"Product Evolution","bodyPlaceholder":"How our product evolved over the past 12 months.","videoUrl":"https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4","videoOpacity":0.18,"videoFilter":"brightness(0.4) grayscale(100%)"},
    {"type":"stats","titlePlaceholder":"Customer Impact","stats":[{"value":"94%","label":"Retention"},{"value":"4.9","label":"Rating"},{"value":"50K","label":"Users"}],"videoUrl":"https://videos.pexels.com/video-files/3191572/3191572-uhd_2560_1440_25fps.mp4","videoOpacity":0.15,"videoFilter":"brightness(0.35) grayscale(100%)"},
    {"type":"section","titlePlaceholder":"Looking Forward","videoUrl":"https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4","videoOpacity":0.18,"videoFilter":"brightness(0.4) grayscale(100%)"},
    {"type":"content","titlePlaceholder":"2026 Strategy","bodyPlaceholder":"Three pillars of our strategy for the year ahead.","videoUrl":"https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4","videoOpacity":0.18,"videoFilter":"brightness(0.4) grayscale(100%)"},
    {"type":"content","titlePlaceholder":"Investment Priorities","bodyPlaceholder":"Where we are allocating resources and why.","videoUrl":"https://videos.pexels.com/video-files/3191572/3191572-uhd_2560_1440_25fps.mp4","videoOpacity":0.18,"videoFilter":"brightness(0.4) grayscale(100%)"},
    {"type":"closing","titlePlaceholder":"Thank You","subtitlePlaceholder":"Questions & Discussion","videoUrl":"https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4","videoOpacity":0.2,"videoFilter":"brightness(0.4) grayscale(100%)"}
  ]'::jsonb,
  NULL,
  ARRAY['annual', 'review', 'report', 'yearend'],
  8
)

ON CONFLICT (slug) DO UPDATE SET
  slides = EXCLUDED.slides,
  preset_id = EXCLUDED.preset_id,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  updated_at = now();
