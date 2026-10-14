/* Slideshow for Kindle — fullscreen screensaver image rotator.
   The screen shows nothing but the photo: tap once to reveal the
   bookmark handle, which auto-hides after a few idle seconds.
   UI strings come from i18n.js (default English); every window.kindle
   call is guarded so the app also runs in a desktop browser. */

/* global window, document, I18N */

var APP_ID = "org.slideshow.kindle";
var DEFAULT_DIR = "/mnt/us/screensaver/";
var SETTINGS_KEY = "slideshow.settings.v1";
var MIN_INTERVAL = 1;
var MAX_INTERVAL = 600;
var HANDLE_HIDE_MS = 5000;   // idle delay before the bookmark disappears
var CORNER_W = 140;          // tap zone that opens settings
var CORNER_H = 120;

var t = window.I18N.t;

var settings = {
    interval: 10,      // seconds
    shuffle: false,
    dir: DEFAULT_DIR
};

var images = [];       // [{ name, url }]
var index = 0;
var timer = null;
var handleHideTimer = null;
var dirOverride = null; // ?dir= for development
var lastTapAt = 0;      // debounce: DOM click + kindle.gestures.ontap
var consecutiveErrors = 0; // broken files are skipped, not stared at
var statusMsg = null;   // { key, vars, isError } — re-rendered on lang change

/* ---------------------------------------------------------------- utils */

function $(id) {
    return document.getElementById(id);
}

function setStatus(key, vars, isError) {
    statusMsg = { key: key, vars: vars, isError: !!isError };
    var el = $("status");
    if (!el) return;
    el.textContent = t(key, vars);
    el.className = isError ? "err" : "";
}

function loadSettings() {
    try {
        var raw = window.localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            var saved = JSON.parse(raw);
            if (typeof saved.interval === "number") {
                settings.interval = clampInterval(saved.interval);
            }
            if (typeof saved.shuffle === "boolean") {
                settings.shuffle = saved.shuffle;
            }
            if (typeof saved.dir === "string" && saved.dir) {
                settings.dir = saved.dir;
            }
        }
    } catch (e) { /* corrupt storage: keep defaults */ }
}

function saveSettings() {
    try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) { /* storage blocked: settings stay session-only */ }
}

function clampInterval(v) {
    v = Math.round(v);
    if (isNaN(v)) v = 10;
    if (v < MIN_INTERVAL) v = MIN_INTERVAL;
    if (v > MAX_INTERVAL) v = MAX_INTERVAL;
    return v;
}

function currentDir() {
    return dirOverride || settings.dir;
}

function withSlash(path) {
    if (path.charAt(path.length - 1) !== "/") {
        return path + "/";
    }
    return path;
}

/* ------------------------------------------------- directory listing */

// Load a URL in a hidden iframe and return its document body HTML.
// Kindle's file:// handler wraps directory listings in <pre>; desktop
// browsers serve their own listing. Both keep <a href> entries.
function fetchText(url, timeoutMs, callback) {
    var iframe = document.createElement("iframe");
    iframe.setAttribute("style", "position:absolute;width:0;height:0;border:0;visibility:hidden;");
    iframe.src = url;

    var done = false;
    function finish(html) {
        if (done) return;
        done = true;
        window.clearTimeout(watchdog);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        callback(html);
    }

    var watchdog = window.setTimeout(function () {
        finish(null); // blocked or hung
    }, timeoutMs || 4000);

    iframe.onload = function () {
        var doc = null;
        try {
            doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        } catch (e) {
            finish(null); // cross-origin
            return;
        }
        if (!doc) {
            finish(null);
            return;
        }
        finish(doc.body ? doc.body.innerHTML : "");
    };

    document.body.appendChild(iframe);
}

// Parse anchors of a directory listing into image file names.
function parseImageNames(html) {
    var names = [];
    if (!html) return names;

    var anchorRe = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    var match;
    while ((match = anchorRe.exec(html)) !== null) {
        var href = match[1];
        var text = match[2].replace(/<[^>]*>/g, "").replace(/^\s+|\s+$/g, "");

        // Prefer the visible text; fall back to the href tail.
        var name = text && text !== "../" ? text : href.split("/").pop();
        name = safeDecode(name);
        if (!name || name === "../" || name === "..") continue;
        if (name.charAt(0) === ".") continue;           // .DS_Store, ._ applejunk
        if (!/\.(png|jpe?g)$/i.test(name)) continue;
        if (names.indexOf(name) === -1) names.push(name);
    }

    names.sort();
    return names;
}

function safeDecode(s) {
    try {
        return decodeURIComponent(s);
    } catch (e) {
        return s;
    }
}

function loadImageList(done) {
    var dir = withSlash(currentDir());
    fetchText(dir, 4000, function (html) {
        var names = parseImageNames(html);
        images = [];
        for (var i = 0; i < names.length; i++) {
            images.push({
                name: names[i],
                url: dir + encodeURIComponent(names[i]).replace(/%2F/g, "/")
            });
        }
        if (settings.shuffle) {
            shuffleInPlace(images);
        }
        index = 0;
        done(images.length);
    });
}

function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}

/* --------------------------------------------------------- slideshow */

function showSlide(i) {
    if (!images.length) {
        $("slide").removeAttribute("src");
        return;
    }
    index = ((i % images.length) + images.length) % images.length;

    var img = $("slide");
    img.onload = function () {
        img.style.visibility = "visible";
        consecutiveErrors = 0;
    };
    img.onerror = function () {
        consecutiveErrors++;
        if (consecutiveErrors < images.length) {
            nextSlide(); // skip the broken file
            return;
        }
        setStatus("status.failed", { dir: withSlash(currentDir()) }, true);
        openSettings();
    };
    img.style.visibility = "hidden";
    img.src = images[index].url;

    // Preload the next one so rotation feels instant.
    if (images.length > 1) {
        var next = new Image();
        next.src = images[(index + 1) % images.length].url;
    }
}

function nextSlide() {
    showSlide(index + 1);
}

function prevSlide() {
    showSlide(index - 1);
}

function restartTimer() {
    if (timer) {
        window.clearInterval(timer);
        timer = null;
    }
    timer = window.setInterval(nextSlide, settings.interval * 1000);
}

/* ------------------------------------------------- bookmark handle */

// States: "" (hidden — pure image), "visible", "active" (settings open)
function setBookmarkState(state) {
    var b = $("bookmark");
    b.className = state;
    var open = state === "active";
    b.setAttribute("aria-expanded", open ? "true" : "false");
    b.setAttribute("aria-label", t(open ? "aria.close" : "aria.open"));
}

function bookmarkVisible() {
    var c = $("bookmark").className;
    return c === "visible" || c === "active";
}

function showBookmark() {
    if ($("bookmark").className === "active") return; // settings open: keep active
    setBookmarkState("visible");
    scheduleHideBookmark();
}

function hideBookmark() {
    if ($("bookmark").className === "visible") {
        setBookmarkState("");
    }
}

function scheduleHideBookmark() {
    if (handleHideTimer) window.clearTimeout(handleHideTimer);
    handleHideTimer = window.setTimeout(function () {
        handleHideTimer = null;
        hideBookmark();
    }, HANDLE_HIDE_MS);
}

function cancelHideBookmark() {
    if (handleHideTimer) {
        window.clearTimeout(handleHideTimer);
        handleHideTimer = null;
    }
}

/* ----------------------------------------------------------- settings */

function syncSettingsUI() {
    $("iv-value").textContent = t("unit.sec", { n: settings.interval });
    $("dir-input").value = currentDir();

    var presetHost = $("presets");
    var buttons = presetHost.getElementsByTagName("button");
    for (var i = 0; i < buttons.length; i++) {
        var v = parseInt(buttons[i].getAttribute("data-iv"), 10);
        buttons[i].className = (v === settings.interval) ? "on" : "";
    }

    var shuffleBtn = $("shuffle-btn");
    shuffleBtn.textContent = t(settings.shuffle ? "shuffle.on" : "shuffle.off");
    shuffleBtn.setAttribute("aria-pressed", settings.shuffle ? "true" : "false");
}

function openSettings() {
    cancelHideBookmark();
    $("settings").className = "";
    $("backdrop").className = "";
    setBookmarkState("active");
    syncSettingsUI();
    if (!images.length) {
        refreshList();
    }
}

function closeSettings() {
    $("settings").className = "hidden";
    $("backdrop").className = "hidden";
    setBookmarkState(""); // back to a pure image
}

function settingsOpen() {
    return $("settings").className !== "hidden";
}

function toggleSettings() {
    if (settingsOpen()) {
        closeSettings();
    } else {
        openSettings();
    }
}

function setIntervalSeconds(v) {
    settings.interval = clampInterval(v);
    saveSettings();
    syncSettingsUI();
    if (statusMsg && statusMsg.key === "status.count") {
        setStatus("status.count", {
            n: images.length,
            iv: settings.interval
        }, false);
    }
    restartTimer();
}

function refreshList() {
    setStatus("status.loading", null, false);
    loadImageList(function (count) {
        if (count === 0) {
            setStatus("status.empty", { dir: withSlash(currentDir()) }, true);
            showSlide(0);
            return;
        }
        setStatus("status.count", {
            n: count,
            iv: settings.interval
        }, false);
        showSlide(0);
        restartTimer();
    });
}

/* ----------------------------------------------------- kindle bridges */

function configureChrome() {
    var k = window.kindle;
    if (!k || !k.messaging || !k.messaging.sendMessage) return;
    try {
        k.messaging.sendMessage("com.lab126.chromebar", "configureChrome", {
            appId: APP_ID,
            topNavBar: {
                template: "title",
                title: "Slideshow",
                buttons: [
                    { id: "KPP_CLOSE", state: "enabled", handling: "system" }
                ]
            },
            systemMenu: {
                clientParams: {
                    profile: {
                        name: "default",
                        items: [],
                        selectionMode: "none",
                        closeOnUse: true
                    }
                }
            }
        });
    } catch (e) { /* chrome config is best-effort */ }
}

function installKindleHooks() {
    var k = window.kindle;
    if (!k) return;

    if (k.appmgr) {
        k.appmgr.ongo = configureChrome;
    }

    if (k.gestures) {
        // Documented: onswipe(direction, pageX, pageY). Directions vary by
        // firmware casing, so compare loosely.
        k.gestures.onswipe = function (direction) {
            var d = String(direction || "").toLowerCase();
            if (settingsOpen()) return;
            if (d.indexOf("left") !== -1) {
                nextSlide();
                showBookmark();
            } else if (d.indexOf("right") !== -1) {
                prevSlide();
                showBookmark();
            }
        };

        // ontap event payload is undocumented; DOM click is primary.
        // This is a guarded secondary path, debounced against double fire.
        k.gestures.ontap = function (event) {
            if (!event) return;
            var x = event.pageX;
            var y = event.pageY;
            if (typeof x !== "number" || typeof y !== "number") return;
            handleTap(x, y);
        };
    }

    configureChrome();
}

// Tap logic shared by DOM clicks and kindle.gestures.ontap.
//
//   handle hidden   -> reveal the bookmark (no page change)
//   handle visible  -> corner tap: open settings; elsewhere: next image
//   settings open   -> close (gesture path; DOM path goes through backdrop)
function handleTap(x, y) {
    var now = new Date().getTime();
    if (now - lastTapAt < 300) return;
    lastTapAt = now;

    if (settingsOpen()) {
        closeSettings();
        return;
    }

    var inCorner = x <= CORNER_W && y <= CORNER_H;

    if (bookmarkVisible()) {
        if (inCorner) {
            openSettings();
            return;
        }
        nextSlide();
        showBookmark(); // keep it up, reset the hide countdown
        return;
    }

    showBookmark(); // first tap only summons the handle
}

function exitApp() {
    var k = window.kindle;
    if (k && k.messaging && k.messaging.sendStringMessage) {
        try {
            k.messaging.sendStringMessage("com.lab126.appmgrd", "stop", "app://" + APP_ID);
            setStatus("exit.sent", null, false);
            return;
        } catch (e) { /* fall through */ }
    }
    setStatus("exit.local", null, true);
}

/* ---------------------------------------------------------- wiring */

function init() {
    loadSettings();

    // Dev override: index.html?dir=/path/to/images
    var query = window.location.search || "";
    var m = /[?&]dir=([^&]+)/.exec(query);
    if (m) {
        dirOverride = safeDecode(m[1]);
    }

    syncSettingsUI();
    setBookmarkState("");

    // Language switch re-renders everything stateful
    window.I18N.onLangChange(function () {
        syncSettingsUI();
        setBookmarkState($("bookmark").className);
        if (statusMsg) {
            setStatus(statusMsg.key, statusMsg.vars, statusMsg.isError);
        }
    });

    // Bookmark handle
    $("bookmark").onclick = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        toggleSettings();
    };

    // Tap target: the photo itself
    $("stage").onclick = function (e) {
        var x = e.pageX;
        var y = e.pageY;
        if (typeof x !== "number") {
            x = -1;
            y = -1;
        }
        handleTap(x, y);
    };

    $("backdrop").onclick = function () {
        closeSettings();
    };

    // Settings controls
    $("iv-minus").onclick = function () { setIntervalSeconds(settings.interval - 1); };
    $("iv-plus").onclick = function () { setIntervalSeconds(settings.interval + 1); };

    var presetHost = $("presets");
    presetHost.onclick = function (e) {
        var el = e.target;
        if (!el || !el.getAttribute) return;
        var v = el.getAttribute("data-iv");
        if (v) setIntervalSeconds(parseInt(v, 10));
    };

    $("shuffle-btn").onclick = function () {
        settings.shuffle = !settings.shuffle;
        saveSettings();
        syncSettingsUI();
        refreshList();
    };

    $("dir-input").onchange = function () {
        var v = this.value.replace(/^\s+|\s+$/g, "");
        if (!v) v = DEFAULT_DIR;
        settings.dir = v;
        saveSettings();
        refreshList();
    };

    $("refresh-btn").onclick = function () {
        var v = $("dir-input").value.replace(/^\s+|\s+$/g, "");
        if (v && v !== settings.dir) {
            settings.dir = v;
            saveSettings();
        }
        refreshList();
    };

    $("exit-btn").onclick = function () {
        exitApp();
    };

    // Keyboard support (development + keyboard cases)
    document.onkeydown = function (e) {
        var key = e.keyCode;
        if (key === 27) {            // Esc
            if (settingsOpen()) closeSettings();
        } else if (key === 37) {     // ←
            if (!settingsOpen()) {
                prevSlide();
                showBookmark();
            }
        } else if (key === 39) {     // →
            if (!settingsOpen()) {
                nextSlide();
                showBookmark();
            }
        }
    };

    installKindleHooks();
    refreshList();
}
