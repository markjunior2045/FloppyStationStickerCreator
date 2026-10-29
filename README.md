# FloppyStation Sticker Creator

Design printable labels for 3.5" floppy disks with the look of an old game label.
Companion to Floppy Station. Runs entirely in the browser; your images never leave your machine.

Work in progress.

## Run locally

ES modules don't load over `file://`, so serve the folder:

```sh
python -m http.server 8000
```

Then open http://localhost:8000.

## Third-party libraries

Vendored in `/vendor` with their licenses (all MIT):

- [Fabric.js](https://github.com/fabricjs/fabric.js)
- [98.css](https://github.com/jdan/98.css)
- [XP.css](https://github.com/botoxparty/XP.css)

## License

MIT
