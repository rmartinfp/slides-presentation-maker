/**
 * Subset of Google Slides API types used by our parser.
 * These mirror the relevant parts of the presentations.get response.
 */

export interface GoogleSlidesPresentation {
  presentationId: string;
  title: string;
  pageSize: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
  slides: GoogleSlide[];
  masters: GooglePage[];
  layouts: GooglePage[];
}

export interface GooglePage {
  objectId: string;
  pageType?: string;
  pageElements?: GooglePageElement[];
  pageProperties?: {
    pageBackgroundFill?: GooglePageBackgroundFill;
  };
  slideProperties?: {
    layoutObjectId?: string;
    masterObjectId?: string;
  };
}

export type GoogleSlide = GooglePage;

export interface GooglePageBackgroundFill {
  propertyState?: string;
  solidFill?: {
    color?: {
      rgbColor?: { red?: number; green?: number; blue?: number };
      themeColor?: string;
    };
    alpha?: number;
  };
  stretchedPictureFill?: {
    contentUrl?: string;
  };
}

export interface GooglePageElement {
  objectId: string;
  size: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
  transform?: {
    scaleX?: number;
    scaleY?: number;
    translateX?: number;
    translateY?: number;
    shearX?: number;
    shearY?: number;
    unit?: string;
  };
  shape?: GoogleShape;
  image?: GoogleImage;
  table?: unknown;
  line?: unknown;
  elementGroup?: {
    children: GooglePageElement[];
  };
}

export interface GoogleShape {
  shapeType: string;
  text?: GoogleTextContent;
  shapeProperties?: {
    shapeBackgroundFill?: {
      solidFill?: {
        color?: { rgbColor?: { red?: number; green?: number; blue?: number } };
        alpha?: number;
      };
    };
    outline?: {
      outlineFill?: {
        solidFill?: {
          color?: { rgbColor?: { red?: number; green?: number; blue?: number } };
        };
      };
      weight?: { magnitude: number; unit: string };
    };
  };
}

export interface GoogleImage {
  contentUrl: string;
  imageProperties?: {
    cropProperties?: unknown;
  };
  sourceUrl?: string;
}

export interface GoogleTextContent {
  textElements: GoogleTextElement[];
}

export interface GoogleTextElement {
  startIndex?: number;
  endIndex?: number;
  paragraphMarker?: {
    style?: {
      alignment?: string;
      lineSpacing?: number;
      spaceAbove?: { magnitude: number; unit: string };
      spaceBelow?: { magnitude: number; unit: string };
    };
    bullet?: {
      listId?: string;
      glyph?: string;
    };
  };
  textRun?: {
    content: string;
    style?: GoogleTextStyle;
  };
}

export interface GoogleTextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  fontSize?: {
    magnitude: number;
    unit: string;
  };
  foregroundColor?: {
    opaqueColor?: {
      rgbColor?: { red?: number; green?: number; blue?: number };
      themeColor?: string;
    };
  };
  link?: {
    url?: string;
  };
}
