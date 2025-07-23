// src/utils/sc.js
const sc = {
    _top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
    top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
    maxTop: document.documentElement.scrollHeight - (window.innerHeight || document.documentElement.clientHeight),
    delta: 0,
    _width: 0,
    _height: 0,
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
    updates: {},
    _update_id: 0,

    addUpdate(fn) {
        sc.updates[++sc._update_id] = fn;
        return sc._update_id;
    },

    deleteUpdate(id) {
        delete sc.updates[id];
    },

    updateScroll(newTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop) {
        sc._top = sc.top;
        sc.top = newTop;
        sc.delta = sc.top - sc._top;
        if (Math.abs(sc.delta) > 200) sc.delta = 0;

        for (const id in sc.updates) {
            if (typeof sc.updates[id] === "function") {
                sc.updates[id]("scroll");
            }
        }
    },

    update(eventType = "resize") {
        if (eventType === "scroll") {
            sc.updateScroll();
        } else {
            sc._width = sc.width;
            sc._height = sc.height;
            sc.width = window.innerWidth || document.documentElement.clientWidth;
            sc.height = window.innerHeight || document.documentElement.clientHeight;
            sc.maxTop = document.documentElement.scrollHeight - sc.height;
        }

        for (const id in sc.updates) {
            if (typeof sc.updates[id] === "function") {
                sc.updates[id](eventType);
            }
        }
    },

    lerp(a, b, t) {
        return (1 - t) * a + t * b;
    },

    _webp: undefined,
    webp() {
        if (sc._webp === undefined) {
            sc._webp = false;
            const canvas = document.createElement("canvas");
            if (canvas.getContext && canvas.getContext("2d")) {
                sc._webp = canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
            }
        }
        return sc._webp;
    },

    loadScript(url, callback) {
        const s = document.createElement("script");
        s.type = "text/javascript";
        if (s.readyState) {
            s.onreadystatechange = function () {
                if (s.readyState === "loaded" || s.readyState === "complete") {
                    s.onreadystatechange = null;
                    callback();
                }
            };
        } else {
            s.onload = callback;
        }
        s.src = url;
        document.head.appendChild(s);
    }
};

export default sc;
