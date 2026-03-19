import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Play, Download, Copy, Trash2,
  MoreHorizontal, Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  title: string;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  slideCount: number;
  activeIndex: number;
}

export default function EditorToolbar({
  title, onTitleChange, onBack, onDuplicate, onDelete,
  slideCount, activeIndex
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      {/* Back */}
      <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
        <ArrowLeft className="w-4 h-4" />
      </Button>

      {/* Title */}
      {isEditing ? (
        <Input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
          autoFocus
          className="max-w-xs h-8 text-sm font-display font-semibold"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="font-display font-semibold text-sm text-foreground hover:text-primary transition-colors truncate max-w-xs"
        >
          {title || 'Untitled'}
        </button>
      )}

      {/* Slide counter */}
      <span className="text-xs text-muted-foreground ml-2">
        {activeIndex + 1} / {slideCount}
      </span>

      <div className="flex-1" />

      {/* AI button */}
      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
        <Sparkles className="w-3.5 h-3.5" />
        AI Assist
      </Button>

      {/* Present */}
      <Button size="sm" className="gap-1.5 text-xs font-display font-semibold">
        <Play className="w-3.5 h-3.5" />
        Present
      </Button>

      {/* Export */}
      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
        <Download className="w-3.5 h-3.5" />
        Export
      </Button>

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate Slide
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Slide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
