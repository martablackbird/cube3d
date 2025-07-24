import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { sc } from "./sc.js";

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

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollTop / docHeight;

      this.scrollRatio = Math.min(Math.max(ratio, 0), 1);
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
    this.renderer.shadowMap.enabled = true,
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-10, 10, 0);
    dirLight.target.position.set(-5, 0, 0);
    this.scene.add(dirLight);
    this.scene.add(dirLight.target);
  }

  load() {
    const loader = new GLTFLoader();
    loader.load(
      new URL('../public/assets/js/cube3d/cube_v1.4_backup3.1.glb', import.meta.url).href,
      (gltf) => {
        const model = gltf.scene;

        if (model.children[13]) {
          model.children[13].material = new THREE.MeshBasicMaterial({ color: "#013656" });
          model.children[13].layers.enable(1);
        }

        [0, 4, 5].forEach(i => {
          const child = model.children[i];
          if (child) model.remove(child);
        });

        this.scene.add(model);

        gltf.animations.forEach(clip => {
          const trackName = clip.tracks[0]?.name || '';
          const nodeName = trackName.split('.')[0];
          const target = model.getObjectByName(nodeName);

          if (target) {
            const mixer = new THREE.AnimationMixer(target);
            const action = mixer.clipAction(clip);
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            action.enabled = true;
            action.play();

            this.mixers.push(mixer);
          } else {
            console.warn(`Target node not found for ${clip.name}`);
          }
        });
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

    const ratio = Math.min(Math.max(this.scrollRatio, 0), 1);

    this.mixers.forEach((mixer, index) => {
    const actions = mixer._actions;

    if (actions && actions.length > 0) {
        const duration = actions[0]._clip.duration;
        const maxRatio = 0.98;
        const ratio = Math.min(Math.max(this.scrollRatio, 0), 1);
        const currentTime = ratio * duration;

        actions.forEach((action) => {
          if (!action.enabled) {
            action.reset();
            action.enabled = true;
            action.play(); 
          }

          // Force pause
          if (this.scrollRatio >= maxRatio && this.scrollDirection === "down") {
            action.paused = true;
          } else {
            action.paused = false;
          }
        });

        mixer.setTime(currentTime);
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