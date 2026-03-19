import React from 'react';
import {
  ContextMenu as RadixContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ArrowUpToLine,
  ArrowDownToLine,
  ClipboardPaste,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';

interface Props {
  children: React.ReactNode;
}

export default function CanvasContextMenu({ children }: Props) {
  const {
    selectedElementIds,
    presentation,
    activeSlideIndex,
    duplicateElements,
    deleteElements,
    lockElement,
    bringToFront,
    sendToBack,
    addElement,
  } = useEditorStore();

  const slide = presentation.slides[activeSlideIndex];
  const selected = slide?.elements?.filter(e => selectedElementIds.includes(e.id)) ?? [];
  const singleSelected = selected.length === 1 ? selected[0] : null;
  const hasSelection = selected.length > 0;

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
        fontFamily: presentation.theme.tokens.typography.bodyFont,
        fontSize: presentation.theme.tokens.typography.bodySize,
        color: presentation.theme.tokens.palette.text,
        textAlign: 'left',
      },
    });
  };

  return (
    <RadixContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {hasSelection ? (
          <>
            <ContextMenuItem onClick={() => duplicateElements()}>
              <Copy className="w-4 h-4 mr-2" /> Duplicate
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => deleteElements()}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </ContextMenuItem>
            {singleSelected && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => bringToFront(singleSelected.id)}>
                  <ArrowUpToLine className="w-4 h-4 mr-2" /> Bring to Front
                </ContextMenuItem>
                <ContextMenuItem onClick={() => sendToBack(singleSelected.id)}>
                  <ArrowDownToLine className="w-4 h-4 mr-2" /> Send to Back
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => lockElement(singleSelected.id, !singleSelected.locked)}
                >
                  {singleSelected.locked ? (
                    <><Unlock className="w-4 h-4 mr-2" /> Unlock</>
                  ) : (
                    <><Lock className="w-4 h-4 mr-2" /> Lock</>
                  )}
                </ContextMenuItem>
              </>
            )}
          </>
        ) : (
          <>
            <ContextMenuItem onClick={handleAddText}>
              Add Text
            </ContextMenuItem>
            <ContextMenuItem onClick={() => {
              addElement({
                type: 'shape',
                content: '',
                x: 400,
                y: 400,
                width: 300,
                height: 200,
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                style: { shapeType: 'rectangle', shapeFill: presentation.theme.tokens.palette.primary, borderRadius: 8 },
              });
            }}>
              Add Shape
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </RadixContextMenu>
  );
}
