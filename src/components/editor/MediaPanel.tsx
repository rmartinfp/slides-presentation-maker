import React, { useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssetUpload } from '@/hooks/useAssetUpload';
import { useEditorStore } from '@/stores/editor-store';
import { toast } from 'sonner';

export default function MediaPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useAssetUpload();
  const addElement = useEditorStore(s => s.addElement);
  const theme = useEditorStore(s => s.presentation.theme.tokens);

  const handleUpload = useCallback(async (file: File) => {
    const result = await upload(file);
    if (result) {
      addElement({
        type: 'image',
        content: result.url,
        x: 400,
        y: 250,
        width: 600,
        height: 400,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        style: {
          objectFit: 'cover',
          borderRadius: 8,
        },
      });
      toast.success('Image added!');
    } else if (error) {
      toast.error(error);
    }
  }, [upload, addElement, error]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = '';
    },
    [handleUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handleUrlInsert = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (!url) return;
    addElement({
      type: 'image',
      content: url,
      x: 400,
      y: 250,
      width: 600,
      height: 400,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: {
        objectFit: 'cover',
        borderRadius: 8,
      },
    });
  }, [addElement]);

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-indigo-500 mx-auto animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        )}
        <p className="text-sm text-slate-600 font-medium">
          {uploading ? 'Uploading...' : 'Drop image or click to upload'}
        </p>
        <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF, WebP — max 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* URL insert */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={handleUrlInsert}
      >
        <ImageIcon className="w-4 h-4" />
        Insert from URL
      </Button>
    </div>
  );
}
