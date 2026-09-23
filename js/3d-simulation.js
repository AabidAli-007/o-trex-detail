/* ==========================================================================
   O-TREX: 3D CAD REAL-TIME SIMULATION ENGINE
   THREE.JS + MULTI-PART STL CAD LOADER + REALISTIC COMPONENT COLORING
   TEAM CODE ZEPHYRA | SMART INDIA HACKATHON 2026
   ========================================================================== */

class OTrex3DSimulation {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Component Meshes
    this.parts = {};
    this.modelGroup = new THREE.Group();
    this.sensorPodGroup = new THREE.Group();
    this.windTurbineMesh = null;
    this.tetherLine = null;

    // Animation States
    this.autoRotate = false;
    this.podDeployed = false;
    this.targetPodY = 0;
    this.currentPodY = 0;
    this.renderMode = 'tactical'; // 'tactical' or 'wireframe'
    this.isLoaded = false;

    // Realistic Multi-Color Component Materials (O-TREX Identity)
    this.materials = {
      hull_port: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.3, roughness: 0.3, name: 'hull_port' }),
      hull_starboard: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.3, roughness: 0.3, name: 'hull_starboard' }),
      deck: new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.6, roughness: 0.4, name: 'deck' }),
      solar: new THREE.MeshStandardMaterial({ color: 0x0284C7, metalness: 0.9, roughness: 0.1, name: 'solar' }),
      wind_turbine: new THREE.MeshStandardMaterial({ color: 0x94A3B8, metalness: 0.8, roughness: 0.2, name: 'wind_turbine' }),
      thrusters: new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.9, roughness: 0.2, name: 'thrusters' }),
      winch: new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3, name: 'winch' }),
      sensor_pod: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.8, roughness: 0.2, name: 'sensor_pod' }),
      gnss: new THREE.MeshStandardMaterial({ color: 0xF8FAFC, metalness: 0.1, roughness: 0.2, name: 'gnss' }),
      antennas: new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.8, roughness: 0.2, name: 'antennas' }),
      enclosure: new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.5, roughness: 0.4, name: 'enclosure' }),
      
      // Wireframe Material
      wireframe: new THREE.MeshBasicMaterial({ color: 0xFACC15, wireframe: true })
    };

    this.init();
  }

  init() {
    this.setupScene();
    this.setupLights();
    this.setupWaterGrid();
    this.loadSTLModel();
    this.setupControls();
    this.setupUI();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090E);

    const width = this.container.clientWidth || this.container.getBoundingClientRect().width || 600;
    const height = this.container.clientHeight || this.container.getBoundingClientRect().height || 540;
    const aspect = (width > 0 && height > 0) ? (width / height) : (600 / 540);

    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    this.camera.position.set(160, 130, 190);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.renderer.domElement.style.cssText = "width: 100% !important; height: 100% !important; display: block; border-radius: 12px;";

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    this.scene.add(this.modelGroup);
    this.scene.add(this.sensorPodGroup);

    // Layout observers
    setTimeout(() => this.onWindowResize(), 50);
    setTimeout(() => this.onWindowResize(), 250);
    setTimeout(() => this.onWindowResize(), 800);
    window.addEventListener('load', () => this.onWindowResize());

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => this.onWindowResize());
      observer.observe(this.container);
    }
  }

  setupLights() {
    // Ambient soft fill light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    // Main Sun Directional Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.3);
    sunLight.position.set(120, 200, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    // Secondary Ocean Rim Light
    const rimLight = new THREE.DirectionalLight(0x0EA5E9, 0.8);
    rimLight.position.set(-150, 50, -100);
    this.scene.add(rimLight);

    // Yellow Accent Light
    const yellowLight = new THREE.PointLight(0xFACC15, 1.2, 300);
    yellowLight.position.set(0, 50, 0);
    this.scene.add(yellowLight);
  }

  setupWaterGrid() {
    const gridHelper = new THREE.GridHelper(500, 40, 0x0EA5E9, 0x1E293B);
    gridHelper.position.y = -15;
    gridHelper.material.opacity = 0.4;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    // Deployed sensor pod tether line
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xFACC15,
      dashSize: 2,
      gapSize: 1,
      scale: 1
    });
    const points = [new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.tetherLine = new THREE.Line(geometry, lineMaterial);
    this.tetherLine.computeLineDistances();
    this.scene.add(this.tetherLine);
  }

  setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 600;
    this.controls.target.set(0, 15, 0);
  }

  loadSTLModel() {
    const loader = new THREE.STLLoader();
    const stlPartsConfig = [
      { file: 'O-TREX_hull_port_1to10.stl', key: 'hull_port', mat: this.materials.hull_port },
      { file: 'O-TREX_hull_starboard_1to10.stl', key: 'hull_starboard', mat: this.materials.hull_starboard },
      { file: 'O-TREX_deck_and_beams_1to10.stl', key: 'deck', mat: this.materials.deck },
      { file: 'O-TREX_solar_panels_1to10.stl', key: 'solar', mat: this.materials.solar },
      { file: 'O-TREX_wind_turbine_1to10.stl', key: 'wind_turbine', mat: this.materials.wind_turbine },
      { file: 'O-TREX_thrusters_1to10.stl', key: 'thrusters', mat: this.materials.thrusters },
      { file: 'O-TREX_winch_system_1to10.stl', key: 'winch', mat: this.materials.winch },
      { file: 'O-TREX_sensor_pod_1to10.stl', key: 'sensor_pod', mat: this.materials.sensor_pod, isPod: true },
      { file: 'O-TREX_gnss_1to10.stl', key: 'gnss', mat: this.materials.gnss },
      { file: 'O-TREX_antennas_1to10.stl', key: 'antennas', mat: this.materials.antennas },
      { file: 'O-TREX_electronics_enclosure_1to10.stl', key: 'enclosure', mat: this.materials.enclosure }
    ];

    let loadedCount = 0;
    const totalParts = stlPartsConfig.length;

    this.showLoadingStatus('LOADING O-TREX 3D CAD MODEL...');

    stlPartsConfig.forEach(config => {
      loader.load(
        `assets/stl_parts/${config.file}`,
        (geometry) => {
          geometry.rotateX(-Math.PI / 2);
          geometry.computeVertexNormals();

          const mesh = new THREE.Mesh(geometry, config.mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          if (config.isPod) {
            this.sensorPodGroup.add(mesh);
            this.parts[config.key] = mesh;
          } else {
            this.modelGroup.add(mesh);
            this.parts[config.key] = mesh;
            if (config.key === 'wind_turbine') {
              this.windTurbineMesh = mesh;
            }
          }

          loadedCount++;
          const percent = Math.round((loadedCount / totalParts) * 100);
          this.showLoadingStatus(`LOADING CAD PARTS: ${percent}%`);

          if (loadedCount === totalParts) {
            this.onAllPartsLoaded();
          }
        },
        undefined,
        (error) => {
          console.warn(`Failed loading ${config.file}, fallback assembly load...`, error);
          this.loadSingleAssemblyFallback();
        }
      );
    });
  }

  loadSingleAssemblyFallback() {
    const loader = new THREE.STLLoader();
    loader.load('assets/stl_parts/O-TREX_assembly_1to10.stl', (geometry) => {
      geometry.rotateX(-Math.PI / 2);
      geometry.computeVertexNormals();
      geometry.center();
      const mesh = new THREE.Mesh(geometry, this.materials.hull_port);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.modelGroup.add(mesh);
      this.onAllPartsLoaded();
    }, undefined, (err) => {
      console.error('Failed loading fallback assembly STL', err);
      this.hideLoadingStatus();
    });
  }

  onAllPartsLoaded() {
    this.isLoaded = true;

    // Calculate combined bounding box of all multi-color STL parts
    const combinedBox = new THREE.Box3().setFromObject(this.modelGroup);
    if (this.sensorPodGroup.children.length > 0) {
      combinedBox.expandByObject(this.sensorPodGroup);
    }

    const center = combinedBox.getCenter(new THREE.Vector3());
    const size = combinedBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      // Center the multi-color model at origin
      this.modelGroup.position.sub(center);
      this.sensorPodGroup.position.sub(center);

      // Lift slightly above ocean grid
      this.modelGroup.position.y += 10;
      this.sensorPodGroup.position.y += 10;

      // Scale model to fit viewport cleanly
      const targetScale = 140 / maxDim;
      this.modelGroup.scale.set(targetScale, targetScale, targetScale);
      this.sensorPodGroup.scale.set(targetScale, targetScale, targetScale);
    }

    this.hideLoadingStatus();
    console.log('O-TREX 3D CAD Multi-Color Assembly Loaded!');
  }

  showLoadingStatus(msg) {
    let loaderEl = this.container.querySelector('.sim-3d-loader');
    if (!loaderEl) {
      loaderEl = document.createElement('div');
      loaderEl.className = 'sim-3d-loader';
      loaderEl.style.cssText = `
        position: absolute; inset: 0; background: rgba(7, 9, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 10; color: #FACC15; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700;
        transition: opacity 0.5s ease; border-radius: 12px;
      `;
      this.container.appendChild(loaderEl);
    }
    loaderEl.innerHTML = `<i class="fa-solid fa-gear fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i><span>${msg}</span>`;
  }

  hideLoadingStatus() {
    const loaderEl = this.container.querySelector('.sim-3d-loader');
    if (loaderEl) {
      loaderEl.style.opacity = '0';
      setTimeout(() => loaderEl.remove(), 400);
    }
  }

  setupUI() {
    const toolbar = document.createElement('div');
    toolbar.className = 'sim-3d-toolbar';
    toolbar.innerHTML = `
      <div class="sim-toolbar-group">
        <button class="sim-btn active" data-cam="iso" title="Isometric View"><i class="fa-solid fa-cube"></i> ISO</button>
        <button class="sim-btn" data-cam="top" title="Top View"><i class="fa-solid fa-table-cells-large"></i> TOP</button>
        <button class="sim-btn" data-cam="front" title="Front View"><i class="fa-solid fa-arrows-left-right"></i> FRONT</button>
        <button class="sim-btn" data-cam="side" title="Side View"><i class="fa-solid fa-arrows-up-down"></i> SIDE</button>
      </div>

      <div class="sim-toolbar-group">
        <button class="sim-btn" id="btnTogglePod"><i class="fa-solid fa-arrows-down-to-line"></i> <span id="podBtnText">DEPLOY POD</span></button>
        <button class="sim-btn" id="btnToggleWireframe"><i class="fa-solid fa-vector-square"></i> CAD WIREFRAME</button>
        <button class="sim-btn" id="btnToggleRotate"><i class="fa-solid fa-rotate"></i> ROTATE</button>
      </div>
    `;

    const telemetryBox = document.createElement('div');
    telemetryBox.className = 'sim-3d-telemetry';
    telemetryBox.innerHTML = `
      <div class="tele-line"><span class="tele-dot"></span> <strong>O-TREX 3D CAD SIMULATION</strong></div>
      <div class="tele-val">PITCH: <span id="telePitch">0.0°</span> | ROLL: <span id="teleRoll">0.0°</span></div>
      <div class="tele-val">POD DEPTH: <span id="telePodDepth" class="text-yellow">0.0 m</span></div>
      <div class="tele-val">AUTOPILOT: <span class="text-yellow">PIXHAWK 6X READY</span></div>
    `;

    this.container.appendChild(toolbar);
    this.container.appendChild(telemetryBox);

    toolbar.querySelectorAll('[data-cam]').forEach(btn => {
      btn.addEventListener('click', () => {
        toolbar.querySelectorAll('[data-cam]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setCameraView(btn.getAttribute('data-cam'));
      });
    });

    document.getElementById('btnTogglePod')?.addEventListener('click', () => this.togglePodDeployment());
    document.getElementById('btnToggleWireframe')?.addEventListener('click', (e) => this.toggleRenderMode(e.currentTarget));
    document.getElementById('btnToggleRotate')?.addEventListener('click', (e) => {
      this.autoRotate = !this.autoRotate;
      e.currentTarget.classList.toggle('active', this.autoRotate);
    });
  }

  setCameraView(view) {
    const duration = 800;
    let targetPos = new THREE.Vector3();
    let targetLook = new THREE.Vector3(0, 15, 0);

    switch(view) {
      case 'top':
        targetPos.set(0, 240, 0.1);
        break;
      case 'front':
        targetPos.set(0, 15, 200);
        break;
      case 'side':
        targetPos.set(200, 15, 0);
        break;
      case 'pod':
        targetPos.set(40, -35, 90);
        targetLook.set(0, -25, 0);
        break;
      case 'iso':
      default:
        targetPos.set(160, 130, 190);
        break;
    }

    const startPos = this.camera.position.clone();
    const startTime = performance.now();

    const animateCam = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerp(targetLook, ease);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCam);
      }
    };

    requestAnimationFrame(animateCam);
  }

  togglePodDeployment() {
    this.podDeployed = !this.podDeployed;
    const btnText = document.getElementById('podBtnText');
    const teleDepth = document.getElementById('telePodDepth');

    if (this.podDeployed) {
      this.targetPodY = -55;
      if (btnText) btnText.textContent = 'RETRACT POD';
      if (teleDepth) teleDepth.textContent = '-15.0 m';
      this.setCameraView('pod');
    } else {
      this.targetPodY = 0;
      if (btnText) btnText.textContent = 'DEPLOY POD';
      if (teleDepth) teleDepth.textContent = '0.0 m';
      this.setCameraView('iso');
    }
  }

  toggleRenderMode(btn) {
    if (this.renderMode === 'tactical') {
      this.renderMode = 'wireframe';
      btn.innerHTML = '<i class="fa-solid fa-cube"></i> TACTICAL SOLID';
      btn.classList.add('active');
    } else {
      this.renderMode = 'tactical';
      btn.innerHTML = '<i class="fa-solid fa-vector-square"></i> CAD WIREFRAME';
      btn.classList.remove('active');
    }

    Object.keys(this.parts).forEach(key => {
      const mesh = this.parts[key];
      if (mesh) {
        if (this.renderMode === 'wireframe') {
          mesh.material = this.materials.wireframe;
        } else {
          const origMat = this.materials[key] || this.materials.hull_port;
          mesh.material = origMat;
        }
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = 1.5;
      this.controls.update();
    }

    // Smooth Pod Deployment Interpolation
    if (Math.abs(this.currentPodY - this.targetPodY) > 0.1) {
      this.currentPodY += (this.targetPodY - this.currentPodY) * 0.05;
      this.sensorPodGroup.position.y = this.currentPodY;

      if (this.tetherLine) {
        const positions = this.tetherLine.geometry.attributes.position.array;
        positions[3] = 0;
        positions[4] = this.currentPodY;
        positions[5] = 0;
        this.tetherLine.geometry.attributes.position.needsUpdate = true;
        this.tetherLine.computeLineDistances();
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || this.container.getBoundingClientRect().width || 600;
    const height = this.container.clientHeight || this.container.getBoundingClientRect().height || 540;

    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }
}

// Global initialization helper
window.initOTrex3D = function(containerId) {
  const sim = new OTrex3DSimulation(containerId);
  window.trex3d = sim;
  return sim;
};
