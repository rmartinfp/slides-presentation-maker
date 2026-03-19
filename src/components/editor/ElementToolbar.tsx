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
            <ArrowRight className="w-4 h-4 mr-2" /> Arrow
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddShape('line')}>
            <Minus className="w-4 h-4 mr-2" /> Line
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
