// ============ Element Types ============

export type ElementType = 'text' | 'image' | 'shape' | 'icon' | 'video';

export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'arrow-right'
  | 'arrow-left'
  | 'line'
  | 'star';

export interface ElementStyle {
  // Text
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;

  // Background & border
  backgroundColor?: string;
  backgroundGradient?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';

  // Effects
  opacity?: number;
  boxShadow?: string;

  // Shape-specific
  shapeType?: ShapeType;
  shapeFill?: string;
  shapeStroke?: string;
  shapeStrokeWidth?: number;

  // Image-specific
  objectFit?: 'cover' | 'contain' | 'fill';

  // Extra CSS
  [key: string]: string | number | undefined;
}

export interface SlideElement {
  id: string;
  type: ElementType;
  content: string; // text content, image URL, or shape data
  x: number; // px within 1920x1080 coordinate system
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0-1
  locked: boolean;
  visible: boolean;
  zIndex: number;
  style: ElementStyle;
}

// ============ Slide & Presentation ============

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image';
  value: string; // color hex, CSS gradient, or image URL
}

export interface Slide {
  id: string;
  elements: SlideElement[];
  background: SlideBackground;
  notes?: string;

  // Legacy fields — kept for backward compatibility during migration
  layout?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  image?: string;
  backgroundImage?: string;
}

export interface ThemeTokens {
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
  };
  typography: {
    titleFont: string;
    bodyFont: string;
    titleSize: number;
    bodySize: number;
  };
  radii: string;
  shadows: string;
}

export interface PresentationTheme {
  id: string;
  name: string;
  category: string;
  tokens: ThemeTokens;
  previewColors: string[];
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  theme: PresentationTheme;
  createdAt: string;
  updatedAt: string;
}

export type ContentSource = 'paste' | 'upload' | 'ai';

export type WizardStep = 'template' | 'content' | 'generating' | 'editor';
