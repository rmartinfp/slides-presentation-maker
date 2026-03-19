import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Palette, Zap, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Palette, title: '30,000+ Templates', description: 'Professional designs', color: 'indigo' },
  { icon: Sparkles, title: 'AI-Powered', description: 'Smart generation', color: 'purple' },
  { icon: Clock, title: '10x Faster', description: 'Minutes, not hours', color: 'pink' },
];

export default function Entry() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-0 w-64 md:w-96 h-64 md:h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-64 md:w-96 h-64 md:h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Header */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 sm:mb-20"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold">SlideAI</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
              Templates
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
              Examples
            </Button>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[60vh] lg:min-h-[70vh]">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              Powered by AI
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-8 leading-[1.1]">
              Create stunning
              <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                presentations
              </span>
              in seconds
            </h1>

            <p className="text-base sm:text-xl text-slate-400 mb-6 sm:mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Choose a template, describe your topic, and let AI create a professional presentation for you.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={() => navigate('/create')}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/30 hover:shadow-2xl transition-all duration-300 text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-7 rounded-xl"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Creating
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white px-6 sm:px-8 py-6 sm:py-7 rounded-xl"
              >
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-6 text-xs sm:text-sm text-slate-500">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>10M+ users</span>
              </div>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600" />
              <span>No credit card</span>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600" />
              <span>Export to PPTX</span>
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Floating slide previews */}
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full aspect-video rounded-2xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/20 backdrop-blur-sm p-6 shadow-2xl"
              >
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-3 bg-indigo-400/40 rounded-full mx-auto mb-3" />
                    <div className="w-32 h-2 bg-purple-400/30 rounded-full mx-auto mb-6" />
                    <div className="flex gap-3 justify-center">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-16 h-16 rounded-lg bg-white/5 border border-white/10" />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Small floating card */}
              <motion.div
                animate={{ y: [8, -8, 8] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-4 -left-4 w-48 rounded-xl bg-slate-900/80 border border-slate-700 p-3 backdrop-blur-sm shadow-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-xs font-medium text-green-400">AI Generated</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-700 rounded-full" />
                  <div className="w-3/4 h-1.5 bg-slate-700 rounded-full" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 sm:mt-24"
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group"
            >
              <f.icon className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
