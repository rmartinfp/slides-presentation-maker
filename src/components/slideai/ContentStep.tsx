import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Sparkles, Upload, FileText } from 'lucide-react';
import { PresentationTheme } from '@/types/presentation';

interface Props {
  theme: PresentationTheme;
  contentText: string;
  onContentChange: (text: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}

export default function ContentStep({ theme, contentText, onContentChange, onGenerate, onBack }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Add Your Content</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Using theme: <span className="text-primary font-medium">{theme.name}</span>
          </p>
        </div>
      </div>

      {/* Content source options */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: FileText, label: 'Paste Text', desc: 'Paste your content directly', active: true },
          { icon: Upload, label: 'Upload File', desc: 'PDF, DOCX, TXT', active: false },
          { icon: Sparkles, label: 'AI Generate', desc: 'Describe your topic', active: false },
        ].map(opt => (
          <button
            key={opt.label}
            className={`p-4 rounded-xl border text-left transition-all ${
              opt.active 
                ? 'border-primary bg-primary/5' 
                : 'border-border bg-card hover:border-muted-foreground/30'
            }`}
          >
            <opt.icon className={`w-5 h-5 mb-2 ${opt.active ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="font-medium text-sm text-foreground">{opt.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="space-y-4">
        <Textarea
          placeholder="Paste your text content here, or describe what you want your presentation to be about...

Example: 'Create a 10-slide presentation about the future of AI in healthcare, covering current applications, challenges, and opportunities for innovation.'"
          value={contentText}
          onChange={e => onContentChange(e.target.value)}
          className="min-h-[240px] resize-none text-sm leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {contentText.length > 0 ? `${contentText.length} characters` : 'No content yet'}
          </span>
          <Button
            onClick={onGenerate}
            disabled={contentText.length < 10}
            className="gap-2 font-display font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            Generate Slides
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
