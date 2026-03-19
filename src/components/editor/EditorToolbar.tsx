import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Download, Share2, Play, Users, Sparkles,
  FileText, FileDown, Undo2, Redo2, ChevronDown, Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Props {
  title: string;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportPptx: () => void;
  onPresent: () => void;
  slideCount: number;
  activeIndex: number;
  saveStatus?: 'idle' | 'saving' | 'saved';
}

export default function EditorToolbar({
  title, onTitleChange, onBack, onDuplicate, onDelete, onExportPptx, onPresent,
  slideCount, activeIndex, saveStatus = 'idle'
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-9 w-9 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="flex-1 flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Input
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
              className="text-base font-semibold border-0 focus-visible:ring-2 focus-visible:ring-indigo-500 px-2 h-9 max-w-xs bg-slate-50"
              placeholder="Untitled Presentation"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-base font-semibold text-slate-800 hover:bg-slate-100 px-2 py-1 rounded transition-colors max-w-xs truncate"
            >
              {title || 'Untitled Presentation'}
            </button>
          )}
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            {slideCount} slides
          </span>
          {saveStatus !== 'idle' && (
            <span className={`text-xs px-2 py-1 rounded-full transition-opacity ${
              saveStatus === 'saving'
                ? 'text-amber-500 bg-amber-50'
                : 'text-emerald-500 bg-emerald-50'
            }`}>
              {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          )}
        </div>
      </div>

      {/* Center controls */}
      <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Undo">
          <Undo2 className="w-4 h-4 text-slate-500" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Redo">
          <Redo2 className="w-4 h-4 text-slate-500" />
        </Button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2 h-9">
          <Eye className="w-4 h-4" />
          <span className="hidden md:inline">Preview</span>
        </Button>

        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Users className="w-4 h-4" />
          <span className="hidden md:inline">Share</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onExportPptx}>
              <FileText className="w-4 h-4 mr-2" />
              PowerPoint (.pptx)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-2 h-9 shadow-md text-white"
          onClick={onPresent}
        >
          <Play className="w-4 h-4" />
          Present
        </Button>
      </div>
    </div>
  );
}
