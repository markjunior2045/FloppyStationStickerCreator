# FloppyStation Sticker Creator

Design printable labels for **3.5" floppy disks** with the look of an old game label, and print them at exact physical size.

Companion to Floppy Station (a launcher that starts PC games when a floppy is inserted).

**Use it online:** https://markjunior2045.github.io/FloppyStationStickerCreator/

Everything runs in your browser. Your images never leave your computer: there is no server, no upload, no account.

## Features

- **Label shape:** front only (71 × 54 mm) or wrap-around (front 54.5 + spine 2.9 + back 13.6 mm, 71 mm wide), with square, 2 or 4 rounded corners. All sizes are adjustable in *Advanced*, since disks vary between brands.
- **What you see is what prints:** the canvas shows the label exactly as it will be printed, on top of a reference drawing of the disk (never exported).
- **Backgrounds and logos:** any number of each. Move, resize and rotate freely. *Fill* covers the whole label, the front or the back, so the back can carry its own image. Logos get an optional outline (following the PNG's transparency) and drop shadow.
- **Text:** front, spine or back, with a short list of retro fonts, size in points, color, alignment, outline and shadow. Double-click to edit on the canvas.
- **Back view:** for wrap-around labels, see the disk's back with the label folded over it.
- **Print effects:** white border, fade, darken and grain, plus presets such as *90s Shareware*.
- **Export:**
  - PDF on A4 at actual size, at 300 or 600 dpi. It includes crop marks, fold marks, an optional cut line that follows the rounded corners, fold lines and a 50 mm calibration ruler.
  - PNG of the label, with its DPI recorded.
  - A sheet that mixes different labels. Add designs to the *Sheet* list, then export them together.
- **Projects:** save and open your design as a `.json` file (images included).
- Undo/redo, layer list, snapping to centers, keyboard shortcuts, and two themes: View › Theme.

## Printing

1. Export the PDF, then print it at **100% / "Actual size"**. Don't use "Fit to page".
2. Check the ruler at the bottom of the sheet: it must measure **50 mm**.
3. Cut along the cut line, fold along the fold lines (wrap-around), and stick the label on the disk.

In wrap-around mode, you design the back upright. The export turns it upside down on the printed strip, so it reads correctly once folded over the disk's top edge.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Ctrl+S / Ctrl+O | Save / open project |
| Ctrl+E | Export |
| Ctrl+0 / Ctrl+1 / Ctrl++ / Ctrl+- | Fit / 100% / zoom in / zoom out |
| Arrows (Shift) | Move the selected layer 0.5 mm (2 mm) |
| Delete | Remove the selected layer |
| Esc | Deselect |

## Run locally

It's a static site with no build step. ES modules don't load over `file://`, so serve the folder:

```sh
python -m http.server 8000
```

Then open http://localhost:8000. Add `?debug` to the URL to expose the editor's internals on `window.app` for testing in the console.

Tested in Chrome, Edge, Brave and Firefox.

## Third-party code and fonts

Vendored in `/vendor` at fixed versions, each with its license:

- [Fabric.js](https://github.com/fabricjs/fabric.js) 7.4.0 (MIT)
- [jsPDF](https://github.com/parallax/jsPDF) 4.2.1 (MIT)
- [98.css](https://github.com/jdan/98.css) 0.1.21 (MIT)
- [XP.css](https://github.com/botoxparty/XP.css) 0.2.6 (MIT)
- Fonts from [Fontsource](https://fontsource.org) 5.3.0, all under the SIL Open Font License 1.1: Press Start 2P, VT323, Silkscreen, Orbitron, Audiowide, Bungee, Russo One, Black Ops One, Righteous, Bebas Neue and Monoton.

The UI recreates a classic desktop style and is not affiliated with any operating system vendor.

## License

MIT, see [LICENSE](LICENSE).
