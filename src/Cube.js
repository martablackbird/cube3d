import * as THREE from 'three';
import { gsap } from "gsap";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { AnimationMixer } from 'three';

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

let requestId = null;

const scroller = {
    target: document.querySelector(".scroll-container"),
    ease: 0.05,
    endY: 0,
    y: 0,
    resizeRequest: 1,
    scrollRequest: 0,
    _on: false,

    update: () => {
      if (!scroller._on) return;

      const needsResize = scroller.resizeRequest > 0;
      if (needsResize) {
        const height = scroller.target.clientHeight;
        document.body.style.height = height + "px";
        sc.maxTop = height;
        scroller.resizeRequest = 0;
      }

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      scroller.endY = scrollTop;
      scroller.y += (scrollTop - scroller.y) * scroller.ease;

      if (Math.abs(scrollTop - scroller.y) < 0.05 || needsResize) {
        scroller.y = scrollTop;
        scroller.scrollRequest = 0;
      }

      // Apply transform
      gsap.set(scroller.target, {
        y: -scroller.y
      });

      // Call update manually after set (onUpdate doesn't work inside gsap.set)
      sc.updateScroll(-scroller.y);

      requestId = scroller.scrollRequest > 0 ? requestAnimationFrame(scroller.update) : null;
    },

    on: () => {
      if (!scroller._on) {
        scroller._on = true;
        document.body.classList.add("assist-scroll");
        scroller.resizeRequest = 1;
        requestId = requestAnimationFrame(scroller.update);
      }
    },

    off: () => {
      if (scroller._on) {
        scroller._on = false;
        if (requestId) cancelAnimationFrame(requestId);
        gsap.killTweensOf(scroller.target);
        document.body.classList.remove("assist-scroll");
        document.body.style.height = "";
        scroller.target.style.transform = "";
      }
    }
};

sc.update = (eventType = "resize") => {
    if (scroller._on) {
        scroller.scrollRequest++;
        if (!requestId) requestId = requestAnimationFrame(scroller.update);
    }

    if (eventType === "scroll") {
        if (scroller._on) return;
        sc.updateScroll();
    } else {
        sc._width = sc.width;
        sc._height = sc.height;
        sc.width = window.innerWidth || document.documentElement.clientWidth;
        sc.height = window.innerHeight || document.documentElement.clientHeight;

        if (scroller._on) {
            scroller.resizeRequest = 1;
        } else {
            sc.maxTop = document.documentElement.scrollHeight - sc.height;
            sc.width < 1024 ? scroller.off() : scroller.on();
        }
    }

    for (const id in sc.updates) {
        if (typeof sc.updates[id] === "function") {
            sc.updates[id](eventType);
        }
    }
};

window.addEventListener("scroll", () => sc.update("scroll"));
window.addEventListener("resize", () => sc.update("resize"));

window.addEventListener("load", () => {
    sc.width < 1024 ? scroller.off() : scroller.on();
});


class Cube {
  constructor() {
    this.materials = {};
    this.mixers = [];
    this.animations = [];
    this.head = document.getElementById("head");
    this.first_update = true;
    this.height = 1.4 * sc.height;
    this.top = -.2 * sc.height + "px";
    this.scrollRatio = 0;
    this.prevScrollRatio = 0;
    this.actions = [];
  }

  init() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initBloomGlow();
    this.initLights();
    this.load();

    sc.addUpdate((e) => {
      this.update(e);
    });

    //event listener for scroll ratio
    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY || window.pageYOffset;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      this.scrollRatio = scrollTop / docHeight;
    });

  }

  initScene() {
    this.scene = new THREE.Scene();
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(45, sc.width / this.height, 1, 1000);
    this.camera.position.set(0, 0.5, 5);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
        alpha: !0,
        antialias: !0
    }),
    this.renderer.setPixelRatio(window.devicePixelRatio),
    this.renderer.setSize(sc.width, this.height),
    this.renderer.physicallyCorrectLights = !0,
    this.renderer.outputEncoding = THREE.sRGBEncoding,
    this.renderer.toneMapping = THREE.LinearToneMapping,
    this.renderer.toneMappingExposure = Math.pow(.94, 5),
    this.renderer.shadowMap.enabled = !0,
    this.renderer.shadowMap.type = THREE.PCFShadowMap,
    this.renderer.domElement.id = "cube",
    this.renderer.domElement.style.position = "fixed",
    this.renderer.domElement.style.top = 0,
    this.renderer.domElement.style.left = 0,
    document.body.appendChild(this.renderer.domElement);
  }

  initBloomGlow() {
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(1);

    const renderScene = new RenderPass(this.scene, this.camera);
    const shaderPass = new ShaderPass(CopyShader);
    shaderPass.renderToScreen = true;
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(sc.width, this.height),
      2, 1, 0
    );

    this.bloomComposer = new EffectComposer(this.renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(renderScene);
    this.bloomComposer.addPass(bloomPass);

    const vertexShader = document.getElementById("vertexshader").textContent;
    const fragmentShader = document.getElementById("fragmentshader").textContent;

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
        },
        vertexShader,
        fragmentShader
      }),
      "baseTexture"
    );

    finalPass.needsSwap = true;
    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(renderScene);
    this.finalComposer.addPass(finalPass);

    this.darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
  }

  initControlls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 0.1;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 5;
    this.controls.enableDamping = true;
    this.controls.enableRotate = false;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1.2, 0);
    
    this.controls.update();

    this.mouseCameraTarget = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z);

    // Event listener mousemove
    document.addEventListener("mousemove", (e) => {
      const deltaX = (e.clientX - window.innerWidth / 2) / 500;
      const deltaY = (e.clientY - window.innerHeight / 2) / 500;
      this.mouseCameraTarget.x = deltaX;
      this.mouseCameraTarget.y = 1.2 - deltaY;
    });

  }

  initLights() {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-10, 10, 0);
    light.target.position.set(-5, 0, 0);
    this.scene.add(light);
    this.scene.add(light.target);
  }

  load() {
    const loader = new GLTFLoader();
    loader.load(
      new URL('../public/assets/js/cube3d/cube_v1.4_backup3.1.glb', import.meta.url).href,
      (gltf) => {
        const model = gltf.scene;

        console.log('Loaded animations:', gltf.animations.map(a => a.name));
        console.log('Total mixers:', this.mixers.length);
        console.log('Scene graph:');
        gltf.scene.traverse(o => console.log('-', o.name));

        if (model.children[13]) {
          model.children[13].material = new THREE.MeshBasicMaterial({ color: "#013656" });
          model.children[13].layers.enable(1);
        }

        [0, 4, 5].forEach(i => {
          const child = model.children[i];
          if (child) model.remove(child);
        });

        this.scene.add(model);

        console.log("Loaded animations: ", gltf.animations.map(a => a.name));
        console.log("Scene graph:");
        model.children.forEach(child => console.log("-", child.name));
        gltf.animations.forEach(clip => {
          console.log("Track:", clip.tracks.map(t => t.name));
        });

        gltf.animations.forEach(clip => {
          const trackName = clip.tracks[0]?.name || '';
          const nodeName = trackName.split('.')[0];
          const target = model.getObjectByName(nodeName);

          if (target) {
            const mixer = new THREE.AnimationMixer(target);
            const action = mixer.clipAction(clip);
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            action.play();

            this.mixers.push(mixer);
          } else {
            console.warn(`❗Target node not found for ${clip.name}`);
          }
        });

        console.log("Total mixers:", this.mixers.length);
      },
      (xhr) => {
        const total = xhr.total || 78252;
        const progress = xhr.loaded / total;
        if (progress === 1) {
          this.initControlls();
          this.update("resize");
          this.render();
        }
      },
      (error) => {
        console.error("Error loading GLTF", error);
      }
    );
  }

  darkenNonBloomed(obj) {
    if (obj.isMesh && !this.bloomLayer.test(obj.layers)) {
      this.materials[obj.uuid] = obj.material;
      obj.material = this.darkMaterial;
    }
  }

  restoreMaterial(obj) {
    if (this.materials[obj.uuid]) {
      obj.material = this.materials[obj.uuid];
      delete this.materials[obj.uuid];
    }
  }

  render() {
    requestAnimationFrame(() => this.render());

    if (this.off_screen) return;

    this.scene.traverse((obj) => this.darkenNonBloomed(obj));
    this.bloomComposer.render();
    this.scene.traverse((obj) => this.restoreMaterial(obj));
    this.finalComposer.render();

    this.mixers.forEach((mixer, index) => {
      const actions = mixer._actions;
      if (actions && actions[0]) {
        const duration = actions[0]._clip.duration;
        const currentTime = this.scrollRatio * duration;
        mixer.setTime(currentTime);

        console.log(`Mixer ${index}: time=${currentTime.toFixed(2)} / ${duration.toFixed(2)}`);
      }
    });

    const isMobile = sc.width < 1024;
    const baseOffset = isMobile ? 0.5 : 0;

    let cameraOffsetY = baseOffset;

    // Update camera position based on mousemove
    this.camera.position.lerp(this.mouseCameraTarget, 0.02);
    this.camera.lookAt(this.controls?.target || new THREE.Vector3(0, 1.2, 0));

    if (cameraOffsetY < 2) {
      this.controls.target.set(0, 1.2 - 3 * cameraOffsetY, 0);
      this.controls.update();
    }
  }

  update(event) {
    if (event === "resize") {
      if (sc.width < 1024 && sc.width === sc._width && sc.height !== sc._height) {
        this.height = 1.4 * sc.height;
        this.camera.fov = 100;
      } else {
        this.height = sc.height;
        this.camera.fov = 45;
      }

      this.camera.aspect = sc.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(sc.width, this.height);
      this.bloomComposer.setSize(sc.width, this.height);
      this.finalComposer.setSize(sc.width, this.height);
    } else {
      this.off_screen = sc.top > this.head.clientHeight;
    }
  }
}

const cube = new Cube();
cube.init();



console.log("Cube3D initialized");
