// Floppy formats, data-driven so others can be added later. v1 ships 3.5" only.
// All values in mm. Coordinates use the front view as shown in the editor:
// label edge at the top, shutter at the bottom, origin at the body's top-left.

export const FLOPPY_35 = {
  id: '3.5',
  name: '3.5"',

  // Reference drawing only, never exported. Body size is the 90 x 94 mm
  // standard; shutter and recess details are approximate.
  body: {
    width: 90.0,
    height: 94.0,
    cornerRadius: 1.0,
    // The write-protect side has one cut corner.
    chamfer: { corner: 'bottom-left', size: 4.0 },
  },
  labelRecess: { width: 73.0, height: 56.5 },
  shutter: {
    width: 48.0,
    height: 30.0,
    cornerRadius: 0.5,
    window: { width: 11.0, height: 19.0, bottom: 4.0 },
  },

  // Label defaults, validated with a real print (see PLAN.md Decisions).
  // The label is centered horizontally and starts at the body's top edge.
  label: {
    width: 71.0,
    wrapAround: { front: 54.5, spine: 2.9, back: 13.6 },
    frontOnlyHeight: 54.0,
    cornerRadius: 2.5,
    safetyMargin: 2.0,
    bleed: 1.5,
  },
};

export const DEFAULT_FORMAT = FLOPPY_35;
