import React from 'react';
import {
  Type,
  Square,
  Circle,
  Triangle,
  Image,
  ArrowRight,
  Minus,
  Trash2,
  Copy,
  Lock,
  Unlock,
  ArrowUpToLine,
  ArrowDownToLine,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditorStore } from '@/stores/editor-store';
import { ShapeType, SlideElement } from '@/types/presentation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function ElementToolbar() {
  const {
    presentation,
    activeSlideIndex,
    selectedElementIds,
    addElement,
    deleteElements,
    duplicateElements,
    lockElement,
    bringToFront,
    sendToBack,
  } = useEditorStore();

  const theme = presentation.theme.tokens;
  const slide = presentation.slides[activeSlideIndex];
  const selectedElements: SlideElement[] = slide?.elements?.filter(e => selectedElementIds.includes(e.id)) ?? [];
  const hasSelection = selectedElements.length > 0;
  const singleSelected = selectedElements.length === 1 ? selectedElements[0] : null;

  const handleAddText = () => {
    addElement({
      type: 'text',
      content: 'New text',
      x: 400,
      y: 400,
      width: 500,
      height: 120,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: {
        fontFamily: theme.typography.bodyFont,
        fontSize: theme.typography.bodySize,
        color: theme.palette.text,
        textAlign: 'left',
      },
    });
  };

  const handleAddShape = (shapeType: ShapeType) => {
    const sizes: Record<ShapeType, { w: number; h: number }> = {
      rectangle: { w: 300, h: 200 },
      circle: { w: 200, h: 200 },
      triangle: { w: 200, h: 200 },
      'arrow-right': { w: 250, h: 100 },
      'arrow-left': { w: 250, h: 100 },
      line: { w: 400, h: 4 },
      star: { w: 200, h: 200 },
    };
    const size = sizes[shapeType] ?? { w: 200, h: 200 };
    addElement({
      type: 'shape',
      content: '',
      x: 600,
      y: 400,
      width: size.w,
      height: size.h,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: {
        shapeType,
        shapeFill: theme.palette.primary,
        shapeStroke: 'transparent',
        shapeStrokeWidth: 0,
        borderRadius: shapeType === 'rectangle' ? 8 : 0,
      },
    });
  };

  const handleAddLine = (variant: 'plain' | 'arrow' | 'arrow-both' | 'dashed' | 'dotted') => {
    const style: Record<string, any> = {
      shapeType: 'line',
      shapeFill: theme.palette.text,
      shapeStroke: 'transparent',
      shapeStrokeWidth: 2,
    };
    if (variant === 'arrow') style.lineTailEnd = 'arrow';
    if (variant === 'arrow-both') { style.lineHeadEnd = 'arrow'; style.lineTailEnd = 'arrow'; }
    if (variant === 'dashed') style.shapeStrokeDash = '8 4';
    if (variant === 'dotted') style.shapeStrokeDash = '2 4';
    addElement({
      type: 'shape', content: '', x: 600, y: 500, width: 400, height: 4,
      rotation: 0, opacity: 1, locked: false, visible: true, style,
    });
  };

  const handleAddTable = (rows = 3, cols = 3) => {
    const defaultRows = Array.from({ length: rows }, (_, ri) =>
      Array.from({ length: cols }, (_, ci) => ({
        text: ri === 0 ? `Header ${ci + 1}` : `Cell ${ri},${ci + 1}`,
      }))
    );
    const tableData = JSON.stringify({ rows: defaultRows, headerRow: true, borderColor: '#e2e8f0' });
    addElement({
      type: 'table', content: tableData, x: 400, y: 300, width: 700, height: 300,
      rotation: 0, opacity: 1, locked: false, visible: true, style: {},
    });
  };

  const handleAddImage = () => {
    // Placeholder — Fase 3 will add proper upload
    const url = prompt('Image URL:');
    if (!url) return;
    addElement({
      type: 'image',
      content: url,
      x: 500,
      y: 300,
      width: 500,
      height: 350,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: {
        objectFit: 'cover',
        borderRadius: 8,
      },
    });
  };

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-slate-200">
      {/* Add elements */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleAddText}>
            <Type className="w-4 h-4" />
            <span className="text-xs hidden lg:inline">Text</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Text Box</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Square className="w-4 h-4" />
            <span className="text-xs hidden lg:inline">Shape</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleAddShape('rectangle')}>
            <Square className="w-4 h-4 mr-2" /> Rectangle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape('circle')}>
            <Circle className="w-4 h-4 mr-2" /> Circle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape('triangle')}>
            <Triangle className="w-4 h-4 mr-2" /> Triangle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape('arrow-right')}>
            <ArrowRight className="w-4 h-4 mr-2" /> Arrow Shape
          </DropdownMenuItem>
          <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lines</div>
          <DropdownMenuItem onClick={() => handleAddLine('plain')}>
            <Minus className="w-4 h-4 mr-2" /> Line
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddLine('arrow')}>
            <ArrowRight className="w-4 h-4 mr-2" /> Arrow Line
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddLine('arrow-both')}>
            <span className="w-4 h-4 mr-2 text-center text-xs">↔</span> Double Arrow
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddLine('dashed')}>
            <span className="w-4 h-4 mr-2 text-center text-[10px]">┄</span> Dashed
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddLine('dotted')}>
            <span className="w-4 h-4 mr-2 text-center text-[10px]">┈</span> Dotted
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleAddImage}>
            <Image className="w-4 h-4" />
            <span className="text-xs hidden lg:inline">Image</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Image</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => handleAddTable()}>
            <Grid3X3 className="w-4 h-4" />
            <span className="text-xs hidden lg:inline">Table</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Table</TooltipContent>
      </Tooltip>

      {hasSelection && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Selection actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => duplicateElements()}>
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => deleteElements()}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>

          {singleSelected && (
            <>
              <Separator orientation="vertical" className="h-6 mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => lockElement(singleSelected.id, !singleSelected.locked)}
                  >
                    {singleSelected.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{singleSelected.locked ? 'Unlock' : 'Lock'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => bringToFront(singleSelected.id)}>
                    <ArrowUpToLine className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bring to Front</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => sendToBack(singleSelected.id)}>
                    <ArrowDownToLine className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send to Back</TooltipContent>
              </Tooltip>
            </>
          )}
        </>
      )}
    </div>
  );
}
