// The document model is in millimeters. Screen and export convert mm -> px.

export const MM_PER_INCH = 25.4;

// CSS pixels per inch. At 100% zoom the canvas is "real size" on a display
// whose OS scaling matches the 96 dpi CSS reference.
export const CSS_PX_PER_INCH = 96;

export const pxPerMm = (dpi) => dpi / MM_PER_INCH;

export const SCREEN_PX_PER_MM = pxPerMm(CSS_PX_PER_INCH);

export const formatMm = (mm) => mm.toFixed(1);
