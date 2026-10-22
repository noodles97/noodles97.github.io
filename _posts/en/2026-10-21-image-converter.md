---
title: An image converter that runs entirely in your browser
tags: [apps]
ref: image-converter
---

Turning HEIC photos into JPEG, making an ICO icon out of a logo, shrinking a few dozen photos to WebP. These come up all the time, and every converter site I found wanted me to upload my files to someone's server, then wrapped the result in ads and size limits. So I built one that runs entirely inside the browser.

**[Open the Image Converter](https://noodles97.github.io/image-converter/en/)**

- Your files never leave your device. Decoding and encoding both happen in your browser, and the output carries no metadata.
- Input can be any image your browser can open: JPEG, PNG, GIF, WebP, BMP, ICO, SVG, AVIF, and HEIC too in Safari. EXIF rotation is applied, then stripped.
- Output comes in ten formats: PNG, JPEG, WebP, AVIF, GIF, BMP, TIFF, ICO, PDF and SVG. For the ones a browser cannot produce on its own (GIF, BMP, TIFF, ICO, PDF) I wrote the encoders by hand. With no external libraries the whole app is about 40 KB, so the first load is light.
- Drop in several images at once and they convert one after another, ready to download as a single ZIP. Drag and drop and clipboard paste both work.
- You can set quality, size (by longest side, width, height or percent) and the background colour for transparent areas. ICO packs several sizes from 16 to 256 into one file, and PDF can be fitted to A4 or Letter.
- Heavy encoding runs in a worker, so the page stays responsive while converting. On a phone you can add it to the home screen and use it like an app, and once opened it keeps working offline.

Saving WebP and AVIF depends on browser support. Where it is missing those formats are shown as disabled in the list. Formats a browser cannot open, such as camera RAW or PSD, are not supported yet.

The source is on [GitHub](https://github.com/noodles97/noodles97.github.io/tree/main/image-converter). Feel free to fix things or reuse it.
