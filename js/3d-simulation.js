/* ==========================================================================
   O-TREX: 3D CAD REAL-TIME SIMULATION ENGINE
   THREE.JS + STL LOADER + PROCEDURAL CAD FALLBACK + TELEMETRY CONTROLS
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

    // Component Groups
    this.parts = {};
    this.modelGroup = new THREE.Group();
    this.sensorPodGroup = new THREE.Group();
    this.windTurbineGroup = new THREE.Group();
    this.tetherLine = null;

    // States
    this.autoRotate = false;
    this.podDeployed = false;
    this.targetPodY = 0;
    this.currentPodY = 0;
    this.renderMode = 'tactical'; // 'tactical' or 'wireframe'
    this.isLoaded = false;
    this.stlAttempted = false;

    // Material Palette
    this.materials = {
      hull: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.3, roughness: 0.3, name: 'hull' }),
      deck: new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.6, roughness: 0.4, name: 'deck' }),
      solar: new THREE.MeshStandardMaterial({ color: 0x0284C7, metalness: 0.9, roughness: 0.1, name: 'solar' }),
      windTurbine: new THREE.MeshStandardMaterial({ color: 0x94A3B8, metalness: 0.8, roughness: 0.2, name: 'turbine' }),
      thrusters: new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.9, roughness: 0.2, name: 'thrusters' }),
      winch: new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3, name: 'winch' }),
      sensorPod: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.8, roughness: 0.2, name: 'pod' }),
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
    this.setupControls();
    this.setupUI();
    
    // Start Model Loading (with guaranteed fallback)
    this.loadModelWithFallback();

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
    this.camera.position.set(140, 110, 170);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.renderer.domElement.style.cssText = "width: 100% !important; height: 100% !important; display: block; border-radius: 12px;";

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
    this.scene.add(this.modelGroup);
    this.scene.add(this.sensorPodGroup);

    // Dynamic resize observers
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
    // Hemisphere light for natural ambient sky/sea illumination
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0EA5E9, 1.2);
    this.scene.add(hemiLight);

    // Primary Sun Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(120, 200, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    // Ocean Rim Light
    const rimLight = new THREE.DirectionalLight(0x0EA5E9, 0.9);
    rimLight.position.set(-150, 50, -100);
    this.scene.add(rimLight);

    // Telemetry Yellow Highlight Light
    const yellowLight = new THREE.PointLight(0xFACC15, 1.2, 300);
    yellowLight.position.set(0, 60, 0);
    this.scene.add(yellowLight);
  }

  setupWaterGrid() {
    const gridHelper = new THREE.GridHelper(500, 40, 0x0EA5E9, 0x1E293B);
    gridHelper.position.y = -15;
    gridHelper.material.opacity = 0.4;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    // Sensor Pod Winch Cable Line
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

  loadModelWithFallback() {
    this.showLoadingStatus('LOADING O-TREX 3D CAD MODEL...');

    // Set fallback safety timer (3.5 seconds)
    const fallbackTimer = setTimeout(() => {
      if (!this.isLoaded) {
        console.warn('STL loading timeout reached. Generating Procedural O-TREX CAD Assembly...');
        this.buildProceduralCADModel();
      }
    }, 3500);

    // Try loading single assembly or multi-part STL
    if (typeof THREE.STLLoader !== 'undefined') {
      const loader = new THREE.STLLoader();
      const stlPath = 'assets/stl_parts/O-TREX_assembly_1to10.stl';
      
      loader.load(
        stlPath,
        (geometry) => {
          clearTimeout(fallbackTimer);
          if (this.isLoaded) return;

          geometry.rotateX(-Math.PI / 2);
          geometry.computeVertexNormals();
          geometry.center();

          const mesh = new THREE.Mesh(geometry, this.materials.hull);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Scale & Center cleanly
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scaleFactor = 130 / maxDim;
            mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
          }

          this.modelGroup.add(mesh);
          this.parts['stl_assembly'] = mesh;
          
          // Also build procedural pod & turbine for interaction
          this.attachInteractiveComponents();

          this.onModelReady();
        },
        undefined,
        (err) => {
          console.warn('Single STL assembly load failed, trying parts or procedural build...', err);
          this.tryLoadMultiParts(fallbackTimer);
        }
      );
    } else {
      clearTimeout(fallbackTimer);
      this.buildProceduralCADModel();
    }
  }

  tryLoadMultiParts(fallbackTimer) {
    const loader = new THREE.STLLoader();
    const partsConfig = [
      { file: 'O-TREX_hull_port_1to10.stl', key: 'hull_port', mat: this.materials.hull },
      { file: 'O-TREX_hull_starboard_1to10.stl', key: 'hull_starboard', mat: this.materials.hull },
      { file: 'O-TREX_deck_and_beams_1to10.stl', key: 'deck', mat: this.materials.deck },
      { file: 'O-TREX_solar_panels_1to10.stl', key: 'solar', mat: this.materials.solar },
      { file: 'O-TREX_wind_turbine_1to10.stl', key: 'wind_turbine', mat: this.materials.windTurbine },
      { file: 'O-TREX_thrusters_1to10.stl', key: 'thrusters', mat: this.materials.thrusters },
      { file: 'O-TREX_winch_system_1to10.stl', key: 'winch', mat: this.materials.winch },
      { file: 'O-TREX_sensor_pod_1to10.stl', key: 'sensor_pod', mat: this.materials.sensorPod, isPod: true },
      { file: 'O-TREX_gnss_1to10.stl', key: 'gnss', mat: this.materials.gnss },
      { file: 'O-TREX_antennas_1to10.stl', key: 'antennas', mat: this.materials.antennas }
    ];

    let loadedCount = 0;
    let failed = false;

    partsConfig.forEach(config => {
      loader.load(
        `assets/stl_parts/${config.file}`,
        (geometry) => {
          if (failed || this.isLoaded) return;
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
          }

          loadedCount++;
          if (loadedCount === partsConfig.length) {
            clearTimeout(fallbackTimer);
            this.centerAndScaleModelGroup();
            this.onModelReady();
          }
        },
        undefined,
        (err) => {
          if (!failed && !this.isLoaded) {
            failed = true;
            clearTimeout(fallbackTimer);
            console.warn('Multi-part STL failed, switching to procedural CAD builder...', err);
            this.buildProceduralCADModel();
          }
        }
      );
    });
  }

  centerAndScaleModelGroup() {
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      this.modelGroup.position.sub(center);
      const scaleFactor = 120 / maxDim;
      this.modelGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  }

  buildProceduralCADModel() {
    if (this.isLoaded) return;
    this.modelGroup.clear();
    this.sensorPodGroup.clear();
    this.parts = {};

    // 1. Twin Catamaran Hydrodynamic Pontoons (Port & Starboard)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 0);
    hullShape.lineTo(60, 0);
    hullShape.quadraticCurveTo(80, 5, 90, 10);
    hullShape.quadraticCurveTo(80, 15, 60, 20);
    hullShape.lineTo(0, 20);
    hullShape.lineTo(0, 0);

    const hullGeo = new THREE.CylinderGeometry(6, 4, 110, 16);
    hullGeo.rotateZ(Math.PI / 2);

    const portHull = new THREE.Mesh(hullGeo, this.materials.hull);
    portHull.position.set(0, 5, -24);
    portHull.scale.set(1, 0.8, 1);
    portHull.castShadow = true;
    this.modelGroup.add(portHull);
    this.parts['port_hull'] = portHull;

    const stbdHull = new THREE.Mesh(hullGeo, this.materials.hull);
    stbdHull.position.set(0, 5, 24);
    stbdHull.scale.set(1, 0.8, 1);
    stbdHull.castShadow = true;
    this.modelGroup.add(stbdHull);
    this.parts['stbd_hull'] = stbdHull;

    // 2. Cross Beams & Deck Platform
    const beamGeo = new THREE.BoxGeometry(100, 4, 52);
    const deckMesh = new THREE.Mesh(beamGeo, this.materials.deck);
    deckMesh.position.set(0, 10, 0);
    deckMesh.castShadow = true;
    this.modelGroup.add(deckMesh);
    this.parts['deck'] = deckMesh;

    // 3. Solar Panel Arrays
    const solarGeo = new THREE.BoxGeometry(70, 2, 20);
    const solarPort = new THREE.Mesh(solarGeo, this.materials.solar);
    solarPort.position.set(-5, 13, -14);
    solarPort.rotation.x = -0.08;
    this.modelGroup.add(solarPort);

    const solarStbd = new THREE.Mesh(solarGeo, this.materials.solar);
    solarStbd.position.set(-5, 13, 14);
    solarStbd.rotation.x = 0.08;
    this.modelGroup.add(solarStbd);
    this.parts['solar'] = solarPort;

    // 4. Wind Turbine Tower & Aerodynamic Blades
    const towerGeo = new THREE.CylinderGeometry(1.5, 2.5, 35, 12);
    const tower = new THREE.Mesh(towerGeo, this.materials.windTurbine);
    tower.position.set(25, 28, 0);
    this.modelGroup.add(tower);

    const nacelleGeo = new THREE.BoxGeometry(10, 6, 6);
    const nacelle = new THREE.Mesh(nacelleGeo, this.materials.windTurbine);
    nacelle.position.set(25, 46, 0);
    this.modelGroup.add(nacelle);

    // Rotor Blades
    for (let i = 0; i < 3; i++) {
      const bladeGeo = new THREE.BoxGeometry(2, 18, 0.6);
      const blade = new THREE.Mesh(bladeGeo, this.materials.windTurbine);
      blade.position.y = 9;
      blade.rotation.z = (i * Math.PI * 2) / 3;
      this.windTurbineGroup.add(blade);
    }
    this.windTurbineGroup.position.set(28, 46, 0);
    this.modelGroup.add(this.windTurbineGroup);
    this.parts['wind_turbine'] = tower;

    // 5. Electronics Watertight Enclosure (Pixhawk 6X & RPi 5)
    const encGeo = new THREE.BoxGeometry(28, 14, 20);
    const enclosure = new THREE.Mesh(encGeo, this.materials.enclosure);
    enclosure.position.set(-15, 18, 0);
    this.modelGroup.add(enclosure);
    this.parts['enclosure'] = enclosure;

    // 6. GNSS Radome & Antennas
    const gnssGeo = new THREE.CylinderGeometry(4, 4, 3, 16);
    const gnss = new THREE.Mesh(gnssGeo, this.materials.gnss);
    gnss.position.set(-24, 26, 0);
    this.modelGroup.add(gnss);
    this.parts['gnss'] = gnss;

    const antGeo = new THREE.CylinderGeometry(0.4, 0.4, 24, 8);
    const ant1 = new THREE.Mesh(antGeo, this.materials.antennas);
    ant1.position.set(-20, 32, -8);
    this.modelGroup.add(ant1);

    const ant2 = new THREE.Mesh(antGeo, this.materials.antennas);
    ant2.position.set(-20, 32, 8);
    this.modelGroup.add(ant2);

    // 7. Stern Thruster Motors
    const thrusterGeo = new THREE.CylinderGeometry(3, 3, 12, 12);
    thrusterGeo.rotateZ(Math.PI / 2);

    const tPort = new THREE.Mesh(thrusterGeo, this.materials.thrusters);
    tPort.position.set(-48, 4, -24);
    this.modelGroup.add(tPort);

    const tStbd = new THREE.Mesh(thrusterGeo, this.materials.thrusters);
    tStbd.position.set(-48, 4, 24);
    this.modelGroup.add(tStbd);
    this.parts['thrusters'] = tPort;

    // 8. Deployable Oceanographic Sensor Pod (CTD + DO + pH)
    this.attachInteractiveComponents();

    this.onModelReady();
  }

  attachInteractiveComponents() {
    this.sensorPodGroup.clear();

    const podBodyGeo = new THREE.CylinderGeometry(5, 5, 20, 16);
    const podMesh = new THREE.Mesh(podBodyGeo, this.materials.sensorPod);

    const podCapGeo = new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const podCap = new THREE.Mesh(podCapGeo, this.materials.winch);
    podCap.position.y = -10;
    podCap.rotation.x = Math.PI;
    podMesh.add(podCap);

    // Sensor probe tips
    for (let i = 0; i < 3; i++) {
      const tipGeo = new THREE.CylinderGeometry(0.6, 0.6, 6, 8);
      const tip = new THREE.Mesh(tipGeo, this.materials.antennas);
      const angle = (i * Math.PI * 2) / 3;
      tip.position.set(Math.cos(angle) * 2.5, -13, Math.sin(angle) * 2.5);
      podMesh.add(tip);
    }

    podMesh.castShadow = true;
    this.sensorPodGroup.add(podMesh);
    this.sensorPodGroup.position.set(0, 0, 0);
    this.parts['sensor_pod'] = podMesh;
  }

  onModelReady() {
    this.isLoaded = true;
    this.hideLoadingStatus();
    console.log('O-TREX 3D CAD Engine ready!');
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
        targetPos.set(140, 110, 170);
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
          const origMat = this.materials[key] || this.materials.hull;
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

    // Aerodynamic Wind Turbine Rotation
    if (this.windTurbineGroup) {
      this.windTurbineGroup.rotation.x += 0.04;
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
