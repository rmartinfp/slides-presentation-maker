import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Palette, Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import HlsVideo from '@/components/ui/HlsVideo';

export default function Entry() {
  const navigate = useNavigate();

  // Fetch all templates (classic + cinematic)
  const { data: classicTemplates } = useQuery({
    queryKey: ['templates-home'],
    queryFn: async () => {
      const { data } = await supabase.from('templates').select('id,name,category,thumbnail_url,layouts,theme').eq('is_active', true).order('sort_order').limit(12);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: cinematicTemplates } = useQuery({
    queryKey: ['cinematic-templates-home'],
    queryFn: async () => {
      const { data } = await supabase.from('cinematic_templates').select('id,name,category,slides,theme,preset_id').eq('is_active', true).order('sort_order').limit(8);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allTemplates = [
    ...(cinematicTemplates || []).map((t: any) => ({
      id: t.id, name: t.name, category: t.category, type: 'cinematic' as const,
      thumbnailUrl: null,
      videoUrl: t.slides?.[0]?.videoBackground?.url,
      videoOpacity: t.slides?.[0]?.videoBackground?.opacity || 0.5,
      bgColor: t.slides?.[0]?.background?.value || t.theme?.tokens?.palette?.bg || '#000',
    })),
    ...(classicTemplates || []).map((t: any) => ({
      id: t.id, name: t.name.replace(/ by Slidesgo$/i, ''), category: t.category === 'Imported' ? 'All' : t.category, type: 'classic' as const,
      thumbnailUrl: t.thumbnail_url,
      videoUrl: null, videoOpacity: 0,
      bgColor: t.theme?.tokens?.palette?.bg || '#fff',
    })),
  ];

  return (
    <div className="min-h-screen mesh-gradient text-slate-900 overflow-hidden font-body">
      {/* Fixed Navigation */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Headline */}
            <h1 className="font-headline font-extrabold text-5xl sm:text-6xl md:text-7xl headline-tight text-slate-900 mb-6">
              Create stunning{' '}
              <br className="hidden sm:block" />
              presentations{' '}
              <span className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] bg-clip-text text-transparent">
                with AI
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-body">
              Pick a template, describe your topic, and get a professional presentation in seconds.
            </p>

            {/* CTA Button */}
            <Button
              size="lg"
              onClick={() => navigate('/create')}
              className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white shadow-xl shadow-[#4F46E5]/25 hover:shadow-2xl hover:shadow-[#4F46E5]/30 transition-all duration-300 text-base px-10 py-6 rounded-full font-semibold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Creating
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

      {/* Templates Showcase — 4 columns, scrollable */}
      <div className="py-16 sm:py-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="font-headline font-extrabold text-3xl sm:text-4xl md:text-5xl headline-tight text-slate-900 mb-4">
              Templates
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Classic slides and cinematic video presentations.
            </p>
          </motion.div>

          {/* Scrollable grid: 4 columns, max 5 rows visible */}
          <div className="max-h-[calc(5*200px)] overflow-y-auto rounded-2xl pr-1" style={{ scrollbarWidth: 'thin' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {allTemplates.map((tmpl, i) => (
                <motion.div
                  key={`${tmpl.type}-${tmpl.id}`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                  onClick={() => navigate('/create')}
                  className="group cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#4F46E5]/10 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: tmpl.bgColor }}>
                    {/* Classic template thumbnail */}
                    {tmpl.thumbnailUrl && (
                      <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {/* Cinematic template video */}
                    {tmpl.videoUrl && (
                      <HlsVideo
                        src={tmpl.videoUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: tmpl.videoOpacity }}
                      />
                    )}
                    {/* Name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/50 to-transparent">
                      <p className="text-xs font-medium text-white truncate">{tmpl.name}</p>
                    </div>
                    {/* Type badge */}
                    {tmpl.type === 'cinematic' && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-[#9333EA]/80 text-white font-medium">
                        Cinematic
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* See all button */}
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/create')}
              className="text-[#4F46E5] hover:text-[#4338CA] font-medium"
            >
              See all templates <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
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
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
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
