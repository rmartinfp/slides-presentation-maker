import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Palette, Zap, Clock, Globe, LayoutGrid, SlidersHorizontal, User } from 'lucide-react';
import { motion } from 'framer-motion';

const templatePreviews = [
  {
    title: 'Startup Pitch',
    category: 'Business',
    gradient: 'from-indigo-500 to-purple-600',
    accent: '#4F46E5',
  },
  {
    title: 'Quarterly Report',
    category: 'Corporate',
    gradient: 'from-emerald-500 to-teal-600',
    accent: '#10b981',
  },
  {
    title: 'Product Launch',
    category: 'Marketing',
    gradient: 'from-orange-500 to-rose-500',
    accent: '#f97316',
  },
  {
    title: 'Course Material',
    category: 'Education',
    gradient: 'from-sky-500 to-blue-600',
    accent: '#0ea5e9',
  },
];

const optionChips = [
  { label: 'Minimalist', icon: SlidersHorizontal },
  { label: '12 Slides', icon: LayoutGrid },
  { label: 'English', icon: Globe },
];

export default function Entry() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>(['Minimalist', '12 Slides', 'English']);

  const toggleChip = (label: string) => {
    setActiveChips(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  };

  return (
    <div className="min-h-screen mesh-gradient text-slate-900 overflow-hidden font-body">
      {/* Fixed Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 nav-glass"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-lg shadow-[#4F46E5]/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-headline font-extrabold headline-tight text-slate-900">SlideAI</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-full hover:bg-white/50 transition-all">
              Templates
            </button>
            <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-full hover:bg-white/50 transition-all">
              Examples
            </button>
            <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-full hover:bg-white/50 transition-all">
              Pricing
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-md shadow-[#4F46E5]/20 cursor-pointer">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative pt-32 sm:pt-40 pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-effect px-4 py-2 rounded-full text-sm font-medium text-slate-600 mb-8 shadow-sm">
              <Zap className="w-4 h-4 text-[#4F46E5]" />
              Powered by AI
            </div>

            {/* Headline */}
            <h1 className="font-headline font-extrabold text-5xl sm:text-6xl md:text-7xl headline-tight text-slate-900 mb-6">
              Create stunning{' '}
              <br className="hidden sm:block" />
              presentations{' '}
              <span className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] bg-clip-text text-transparent">
                with AI
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-body">
              Describe your topic, pick a style, and watch your presentation come to life in seconds. No design skills needed.
            </p>
          </motion.div>

          {/* Glass Prompt Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="glass-effect rounded-2xl p-5 sm:p-6 shadow-xl shadow-[#4F46E5]/5 max-w-2xl mx-auto"
          >
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your presentation... e.g. A pitch deck for my AI startup that automates customer support"
              rows={3}
              className="w-full bg-white/60 border border-slate-200/60 rounded-xl p-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]/30 resize-none text-sm font-body transition-all"
            />

            {/* Option Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-4 mb-4">
              {optionChips.map(chip => {
                const isActive = activeChips.includes(chip.label);
                return (
                  <button
                    key={chip.label}
                    onClick={() => toggleChip(chip.label)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#4F46E5]/10 text-[#4F46E5] outline outline-1 outline-[#4F46E5]/20'
                        : 'bg-white/60 text-slate-500 outline outline-1 outline-slate-200/60 hover:bg-white/80 hover:text-slate-700'
                    }`}
                  >
                    <chip.icon className="w-3 h-3" />
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              onClick={() => navigate('/create')}
              className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white shadow-xl shadow-[#4F46E5]/25 hover:shadow-2xl hover:shadow-[#4F46E5]/30 transition-all duration-300 text-sm sm:text-base px-8 py-6 rounded-full font-semibold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Presentation
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-8 text-sm text-slate-400"
          >
            <span>10M+ presentations created</span>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
            <span>No credit card required</span>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
            <span>Export to PPTX</span>
          </motion.div>
        </div>
      </div>

      {/* Showcase Section */}
      <div className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="font-headline font-extrabold text-3xl sm:text-4xl md:text-5xl headline-tight text-slate-900 mb-4">
              Presentations of the Future
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Choose from professionally designed templates or let AI create something unique for you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {templatePreviews.map((template, i) => (
              <motion.div
                key={template.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                onClick={() => navigate('/create')}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white/60 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-[#4F46E5]/10 hover:-translate-y-2 transition-all duration-300"
              >
                <div className={`aspect-video bg-gradient-to-br ${template.gradient} relative overflow-hidden`}>
                  {/* Mock slide content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <div className="w-16 h-2 bg-white/30 rounded-full mb-2" />
                    <div className="w-24 h-1.5 bg-white/20 rounded-full mb-4" />
                    <div className="flex gap-2">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="w-8 h-8 rounded bg-white/10" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-headline font-bold text-sm text-slate-800 group-hover:text-[#4F46E5] transition-colors">
                    {template.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{template.category}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Row */}
      <div className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Palette, title: '30,000+ Templates', description: 'Professional designs for every occasion', color: '#4F46E5' },
              { icon: Sparkles, title: 'AI-Powered', description: 'Smart generation in seconds', color: '#9333EA' },
              { icon: Clock, title: '10x Faster', description: 'Minutes, not hours of work', color: '#4F46E5' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-effect rounded-2xl p-6 hover:shadow-2xl hover:shadow-[#4F46E5]/10 hover:-translate-y-2 transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-lg shadow-[#4F46E5]/20 mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-headline font-bold text-slate-800 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Dark Footer */}
      <footer className="bg-slate-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-headline font-extrabold">SlideAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Templates</a>
              <a href="#" className="hover:text-white transition-colors">Examples</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
            <p className="text-sm text-slate-500">&copy; 2026 SlideAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
