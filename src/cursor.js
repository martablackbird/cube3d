import { gsap } from "gsap";
import { sc } from "./sc.js"; // Assuming sc is a module that provides some utility functions

class Cursor {
    constructor() {
        this.showed = false;
        this.size = 50;
        this.border = 2;

        this.cursor = document.createElement("DIV");
        this.cursor.classList.add("cursor");
        document.body.appendChild(this.cursor);

        this.cursor_in = document.createElement("DIV");
        this.cursor.appendChild(this.cursor_in);

        this.cursor_point = document.createElement("DIV");
        document.body.appendChild(this.cursor_point);

        this.cursor.style.pointerEvents =
            this.cursor_in.style.pointerEvents =
            this.cursor_point.style.pointerEvents =
                "none";

        this.cursor.style.zIndex =
            this.cursor_in.style.zIndex =
            this.cursor_point.style.zIndex =
                "10000";

        this.cursor.style.position = this.cursor_point.style.position = "fixed";
        this.cursor_in.style.position = "absolute";

        this.cursor.style.top = this.cursor_point.style.top = 0;
        this.cursor_in.style.bottom = 0;
        this.cursor.style.left =
            this.cursor_in.style.left =
            this.cursor_point.style.left =
                0;

        this.cursor.style.border = "0 solid rgba(255,255,255,0.4)";
        this.cursor_point.style.border = "0 solid rgba(255,255,255,1)";

        this.cursor.style.opacity = this.cursor_point.style.opacity = 0;
        this.cursor_in.style.background = "linear-gradient(135deg, #c7fdff, #013656)";
        this.cursor_in.style.width = "100%";

        this.cursor.style.width = this.size;
        this.cursor.style.height = this.size;

        this.cursor.style.transform = `translate(${sc.width / 2 - this.size / 2}px, ${sc.height / 2 - this.size / 2}px)`;
        this.cursor_point.style.transform = `translate(${sc.width / 2 - 1}px, ${sc.height / 2 - 1}px)`;

        const e = sc.webp() ? "webp" : "jpg";
        this.images_loading = false;
    }

    init() {
        this.onMouseEnterFn = e => this.show(e);
        this.onMouseMoveFn = e => this.move(e);
        this.onMouseLeaveFn = e => this.hide(e);
        this.onMouseOverFn = e => this.over(e);
        this.created = true;
        this.create();
    }

    create() {
        this.created = true;
        document.body.addEventListener("mouseenter", this.onMouseEnterFn, false);
        document.body.addEventListener("mousemove", this.onMouseMoveFn, false);
        document.body.addEventListener("mouseleave", this.onMouseLeaveFn, false);
        document.body.addEventListener("mouseover", this.onMouseOverFn, false);
        this.show();
    }

    destroy() {
        this.created = false;
        document.body.removeEventListener("mouseenter", this.onMouseEnterFn);
        document.body.removeEventListener("mousemove", this.onMouseMoveFn);
        document.body.removeEventListener("mouseleave", this.onMouseLeaveFn);
        document.body.removeEventListener("mouseover", this.onMouseOverFn);
        this.hide();
    }

    over(e) {
        const t =
            e.target.tagName === "A" ||
            e.target.className === "dsgn__container dsgn__container--video" ||
            e.target.className === "pnlm-container" ||
            e.target.className === "pnlm-dragfix";
        this.size = t ? 0 : 50;
    }

    loadImages() {
        if (this.images_loading) return;
        this.images_loading = true;
        this.images.forEach(e => {
            if (e.src) this.loadImage(e);
        });
    }

    setImage(e) {
        if (
            this.images[e] &&
            this.images[e].el.classList.contains("show-image") &&
            !this.images[e].el.classList.contains("hide-image")
        ) return;

        this.cursor.querySelectorAll(".show-image").forEach(el => {
            el.classList.add("hide-image");
            if (el.type === "video") el.pause();
        });

        if (this.images[e]) {
            this.images[e].el.style.transition = "none";
            this.images[e].el.classList.remove("show-image", "hide-image");
            setTimeout(() => {
                this.images[e].el.style.transition = "";
                this.images[e].el.classList.add("show-image");
                if (this.images[e].type === "video") this.images[e].el.play();
            }, 10);
        }
    }

    show(e) {
        this.showed = true;
        gsap.to(this.cursor, {
            duration: 1,
            width: this.size,
            height: this.size,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderLeftWidth: 1,
            opacity: 1,
            ease: "power2.out"
        });
        gsap.to(this.cursor_point, {
            duration: 0.5,
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            opacity: 1,
            ease: "power2.out"
        });
    }

    move(e) {
        if (!this.showed) this.show(e);

        gsap.to(this.cursor, {
            duration: 1,
            x: e.x - this.size / 2,
            y: e.y - this.size / 2,
            width: this.size,
            height: this.size,
            opacity: this.size / 50,
            ease: "power2.out"
        });

        gsap.to(this.cursor_point, {
            duration: 0.5,
            x: e.x - 2,
            y: e.y - 2,
            opacity: this.size === 50,
            ease: "power2.out"
        });
    }

    hide(e) {
        this.showed = false;
        gsap.to(this.cursor, {
            duration: 1,
            width: 0,
            height: 0,
            borderTopWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth: 0,
            borderLeftWidth: 0,
            opacity: 0,
            ease: "power2.out"
        });
        gsap.to(this.cursor_point, {
            duration: 0.5,
            borderTopWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth: 0,
            borderLeftWidth: 0,
            opacity: 0,
            ease: "power2.out"
        });
    }

    loaded(e = 1) {
        this.per = 100 * e;
        this.loader = gsap.to(this.cursor_in, {
            duration: 1,
            height: this.per + "%",
            onComplete: () => {
                if (this.loader.vars.height === "100%") this.onLoaded();
            }
        });
    }

    onLoaded() {
        this.cursor_in.style.bottom = "";
        this.cursor_in.style.top = 0;

        const e = document.getElementById("loader");
        gsap.to(e, {
            duration: 2,
            height: 0,
            borderBottomLeftRadius: "50%",
            borderBottomRightRadius: "50%",
            ease: "power4.inOut",
            onComplete: () => {
                this.update("resize");
                sc.addUpdate(e => {
                    this.update(e);
                });
            }
        });

        gsap.to(this.cursor_in, {
            duration: 2,
            height: 0,
            borderBottomLeftRadius: "50%",
            borderBottomRightRadius: "50%",
            ease: "power4.inOut"
        });

        sc.loaded();
    }

    update(e) {
        if (e === "resize") {
            if (sc.width < 1024) {
                if (!this.created) return;
                this.destroy();
            } else if (!this.created) {
                this.create();
            }
        }
    }
}

const cursor = new Cursor();
cursor.init();
