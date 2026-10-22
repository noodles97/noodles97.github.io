---
title: A four-track MIDI sequencer you draw with your mouse
tags: [apps]
ref: pocket-band
---

Opening a DAW just to jot down a riff or a chord progression is overkill. I wanted something that needs no install and no login: open a page, draw a few notes, hear them, and take the result away as a MIDI file to finish properly later. So I built a small sequencer with four tracks: guitar, bass, keys and drums.

**[Open the Pocket Band Sequencer](https://noodles97.github.io/pocket-band/en/)**

- Press an empty cell and drag sideways to set a note's length, or up and down to set its pitch. Drag a note to move it, grab its right edge to resize it, and delete with a double-click, a right-click or Erase mode.
- On the drum track each row is one instrument: kick, snare, hi-hats, toms, crash, ride and clap. Drag sideways to paint repeated hits.
- Each track covers its real instrument range. Bass starts at E1, guitar at E2, keys run from C2 to C7. Notes from the other tracks show faintly behind the current one, which makes lining up harmonies easy.
- Sound comes from a built-in Web Audio synth, so there is nothing to load. Press a key on the left to preview it. The transport has play, loop, BPM, 1 to 8 bars, and per-track volume and mute.
- A finished piece saves as a standard MIDI file (.mid): one tempo track plus four instrument tracks, with drums on channel 10, so it opens in GarageBand, Logic, Ableton, FL Studio or anything else. Projects also save and load as .json, and the browser keeps your work automatically.
- No external libraries. It is one HTML, one CSS and one JavaScript file, so it loads fast. On a phone you can add it to the home screen and use it like an app, and once opened it keeps working offline.

The page opens with a four-bar example (Am–F–C–G) so you can press play and hear it before clearing it out. The Korean version lives at [/pocket-band/](https://noodles97.github.io/pocket-band/), and the button in the top right switches between the two.

Touch works on phones, with one catch: in Draw mode, swiping the grid draws instead of scrolling, so switch to Scroll mode or swipe the key column on the left. Erase mode is the reliable way to delete. I deliberately left out chord helpers, scale lock and velocity editing. This is meant for sketching an idea quickly; polishing belongs in the DAW you take the MIDI into.

The source is on [GitHub](https://github.com/noodles97/noodles97.github.io/tree/main/pocket-band). Feel free to fix things or reuse it.
