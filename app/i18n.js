/* kindle-slideshow — i18n engine + strings.
   Default language: English. Choice persists in localStorage. */

(function () {
    "use strict";

    var DICT = {
        en: {
            "settings.title": "Settings",
            "interval": "Interval",
            "presets": "Presets",
            "shuffle": "Shuffle",
            "shuffle.on": "On",
            "shuffle.off": "Off",
            "folder": "Image folder",
            "lang.label": "Language",
            "refresh": "Refresh list",
            "exit": "Exit app",
            "foot": "Tap outside to close · swipe to change image",
            "unit.sec": "{n} s",

            "status.loading": "Scanning image list…",
            "status.empty": "No images found — put PNG/JPG in {dir}",
            "status.count": "{n} images · interval {iv} s",
            "status.failed": "All images failed to load — check {dir}",

            "exit.sent": "Exit requested; if it stays, tap ✕ in the top bar",
            "exit.local": "Cannot exit here; on Kindle tap ✕ in the top bar",

            "aria.open": "Open settings",
            "aria.close": "Close settings"
        },
        zh: {
            "settings.title": "设置",
            "interval": "轮播间隔",
            "presets": "快捷",
            "shuffle": "随机播放",
            "shuffle.on": "开",
            "shuffle.off": "关",
            "folder": "图片文件夹",
            "lang.label": "语言",
            "refresh": "刷新列表",
            "exit": "退出应用",
            "foot": "轻点面板外部关闭 · 左右滑动切换图片",
            "unit.sec": "{n} 秒",

            "status.loading": "正在读取图片列表…",
            "status.empty": "没有找到图片 — 请把 PNG/JPG 放进 {dir}",
            "status.count": "共 {n} 张图片 · 间隔 {iv} 秒",
            "status.failed": "图片全部加载失败，请检查 {dir}",

            "exit.sent": "已发送退出请求；若未退出，请点右上角 ✕",
            "exit.local": "此环境无法退出；Kindle 上请点右上角 ✕",

            "aria.open": "打开设置",
            "aria.close": "关闭设置"
        }
    };

    var listeners = [];
    var lang = "en";
    try {
        var saved = window.localStorage.getItem("kss.lang");
        if (saved === "zh" || saved === "en") lang = saved;
    } catch (e) { /* storage unavailable: stay English */ }

    function t(key, vars) {
        var table = DICT[lang] || DICT.en;
        var s = table[key];
        if (s === undefined) s = DICT.en[key];
        if (s === undefined) return key;
        if (vars) {
            for (var k in vars) {
                if (Object.prototype.hasOwnProperty.call(vars, k)) {
                    s = s.split("{" + k + "}").join(vars[k]);
                }
            }
        }
        return s;
    }

    function applyStatic() {
        var nodes = document.querySelectorAll("[data-i18n]");
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
        }
        document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
        var btns = document.querySelectorAll("[data-lang]");
        for (var b = 0; b < btns.length; b++) {
            btns[b].className = (btns[b].getAttribute("data-lang") === lang) ? "on" : "";
        }
    }

    function setLang(l) {
        if (l !== "en" && l !== "zh") return;
        lang = l;
        try { window.localStorage.setItem("kss.lang", l); } catch (e) { /* ignore */ }
        applyStatic();
        for (var i = 0; i < listeners.length; i++) listeners[i]();
    }

    function onLangChange(fn) { listeners.push(fn); }

    function initToggle() {
        var wrap = document.getElementById("lang-toggle");
        if (!wrap) return;
        wrap.onclick = function (e) {
            var el = e.target;
            while (el && el !== wrap && !el.getAttribute("data-lang")) el = el.parentNode;
            if (el !== wrap && el && el.getAttribute("data-lang")) setLang(el.getAttribute("data-lang"));
        };
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyStatic();
        initToggle();
    });

    window.I18N = {
        t: t,
        setLang: setLang,
        getLang: function () { return lang; },
        onLangChange: onLangChange,
        applyStatic: applyStatic
    };
})();
