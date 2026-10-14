# kindle-slideshow

> Fullscreen slideshow for your jailbroken Kindle's screensaver images.

**English** | [简体中文](README.zh-CN.md)

Rotate the images in `/mnt/us/screensaver/` (`bg_ss00.png` …) fullscreen, with a
reader-like feel: the screen shows nothing but the photo — **tap the screen to
reveal the bookmark handle** in the top-left corner, then tap it to open
settings for the rotation interval, shuffle, image folder, or exiting the app.

## Features

- Fullscreen rotation of screensaver images on a configurable interval;
  **zero chrome by default — pure image only**
- Tap the screen to summon the top-left bookmark handle; it auto-hides after
  5 idle seconds
- Swipe left/right or tap to turn pages like a reader
- Settings popover behind the bookmark:
  - **Interval**: 1–600 seconds, with 5 / 10 / 15 / 30 / 60 s presets
  - **Shuffle**: randomize image order
  - **Image folder**: defaults to `/mnt/us/screensaver/`, any directory works
  - **Exit app**
- Settings persist in localStorage across launches
- The system ✕ in the top bar also exits the app

## Compatibility

- Jailbroken Kindles (modern jailbreaks such as SpiderCat / WinterBreak);
  target device for testing: Kindle Paperwhite 4, firmware 5.17.x
- The app is a plain **Mesquite WAF** (HTML/CSS/JS): no network access, no
  third-party libraries
- Also runs in a desktop browser for development (see “Local development”)

## Repository structure

```
kindle-slideshow/
├── app/                    # Mesquite webapp
│   ├── config.xml          # widget manifest: permissions, gestures, messaging
│   ├── index.html          # markup
│   ├── main.css            # black-and-white e-ink styling
│   └── main.js             # rotation / settings / gestures / Kindle bridge
├── install_slideshow.sh    # installer scriptlet (one tap on device)
├── LICENSE                 # MIT
└── README.md
```

## Install

Prerequisites: a jailbroken device that can run `.sh` scriptlets from
`documents` (all modern jailbreaks do).

1. Connect the Kindle over USB and copy the repo's `app/` folder onto it,
   renamed to `slideshow`:

   ```
   <repo>/app/  →  /mnt/us/documents/slideshow/
   ```

2. Copy the installer scriptlet:

   ```
   <repo>/install_slideshow.sh  →  /mnt/us/documents/install_slideshow.sh
   ```

3. Eject the USB connection, then open **Install Slideshow** from the Kindle
   library. The screen shows `Slideshow installed. Launching...` and the app
   starts.

To relaunch later, tap the same scriptlet again (reinstalling is safe), or run:

```sh
lipc-set-prop com.lab126.appmgrd start app://org.slideshow.kindle
```

## Usage

The screen shows **only the image** — no controls at all:

| Action | Effect |
| --- | --- |
| Tap the screen | Reveals the bookmark handle (auto-hides after 5 s idle) |
| Tap the bookmark | Opens the settings panel (tap it again or outside to close) |
| Tap the image while the handle is visible | Next image |
| Swipe left / right | Next / previous image (also summons the handle) |
| Keyboard ← → | Previous / next image (external keyboard) |
| System ✕ in the top bar | Exit the app |

Default interval is 10 seconds. Images come from `/mnt/us/screensaver/` —
the same folder the system screensaver uses, so adding or removing files
updates both at once.

## Local development

The app runs without a Kindle. Start a static server from the repo's
**parent** directory:

```sh
cd /path/to/parent   # the level containing kindle-slideshow/ and your images
python3 -m http.server 8000
```

Then open
`http://127.0.0.1:8000/kindle-slideshow/app/index.html?dir=/screensaver/`
(`?dir=` points at any directory containing PNG/JPG files, relative or
absolute) to exercise rotation, settings, and keyboard controls in the
browser. All `window.kindle` calls are guarded and silently skipped there.

## How it works

- The app is a standard Mesquite WAF: `install_slideshow.sh` copies `app/` to
  `/var/local/mesquite/slideshow/`, registers `org.slideshow.kindle` in
  `/var/local/appreg.db`, then launches it via the LIPC `start` property of
  `com.lab126.appmgrd`.
- The image list is read by loading the directory in a hidden iframe and
  parsing its `<a href>` entries (Kindle's `file://` listings are wrapped in
  a `<pre>`; the parser handles both that and desktop listings).
- The top bar and exit go through `kindle.messaging` →
  `com.lab126.chromebar` (the close button is handled by the system).
- Gestures use `kindle.gestures.onswipe` / `ontap`, layered over DOM click
  handling as a fallback.

## To verify on device

These behaviors were implemented without hardware; confirm them on the first
real run:

1. **“Exit app” in settings** sends
   `sendStringMessage("com.lab126.appmgrd", "stop", …)`. If the firmware
   ignores it, the system ✕ in the top bar always exits (fallback).
2. **`internetRequired=no`**: if the app refuses to launch, change that entry
   in `config.xml` back to `yes` and reinstall.
3. **`ontap` event coordinates**: if gestures and DOM clicks both fire on the
   device (handle flashes open and shut), widen the debounce window in
   `handleTap` (`main.js`).
4. **Swipe direction**: direction casing varies by firmware; matching is
   case-insensitive. If directions are flipped, please report it.

## Uninstall

On the Kindle (via SSH or a scriptlet):

```sh
lipc-set-prop com.lab126.appmgrd stop app://org.slideshow.kindle
rm -rf /var/local/mesquite/slideshow
sqlite3 /var/local/appreg.db "DELETE FROM properties WHERE handlerId='org.slideshow.kindle';"
sqlite3 /var/local/appreg.db "DELETE FROM handlerIds WHERE handlerId='org.slideshow.kindle';"
```

Then remove `slideshow/` and `install_slideshow.sh` from `documents`.

## License

[MIT](LICENSE)
