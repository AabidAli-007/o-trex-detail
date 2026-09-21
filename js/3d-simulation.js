/* ==========================================================================
   O-TREX: 3D CAD REAL-TIME SIMULATION ENGINE (SLOW NETWORK PROOF)
   THREE.JS + STL LOADER + INSTANT PARAMETRIC CAD FALLBACK
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

    // Component Meshes & Groups
    this.parts = {};
    this.modelGroup = new THREE.Group();
    this.sensorPodGroup = new THREE.Group();
    this.windTurbineMesh = null;
    this.tetherLine = null;

    // Animation States
    this.autoRotate = true;
    this.podDeployed = false;
    this.targetPodY = 0; // Local Y displacement
    this.currentPodY = 0;
    this.renderMode = 'tactical'; // 'tactical', 'wireframe', 'xray'
    this.isLoaded = false;
    this.usingProceduralModel = false;
    this.stlLoaded = false;

    // Materials Palette (O-TREX Identity)
    this.materials = {
      hull: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.2, roughness: 0.3, name: 'hull' }),
      deck: new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.6, roughness: 0.4, name: 'deck' }),
      solar: new THREE.MeshStandardMaterial({ color: 0x0284C7, metalness: 0.9, roughness: 0.1, name: 'solar' }),
      windTurbine: new THREE.MeshStandardMaterial({ color: 0x64748B, metalness: 0.8, roughness: 0.2, name: 'turbine' }),
      thrusters: new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.9, roughness: 0.2, name: 'thrusters' }),
      winch: new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3, name: 'winch' }),
      sensorPod: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.8, roughness: 0.2, name: 'pod' }),
      gnss: new THREE.MeshStandardMaterial({ color: 0xF8FAFC, metalness: 0.1, roughness: 0.2, name: 'gnss' }),
      antennas: new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.8, roughness: 0.2, name: 'antennas' }),
      enclosure: new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.5, roughness: 0.4, name: 'enclosure' }),
      
      // Wireframe Material
      wireframe: new THREE.MeshBasicMaterial({ color: 0xFACC15, wireframe: true }),
      
      // X-Ray Material
      xray: new THREE.MeshStandardMaterial({ color: 0x0EA5E9, transparent: true, opacity: 0.35, wireframe: false }),
      xrayHighlight: new THREE.MeshStandardMaterial({ color: 0xFACC15, metalness: 0.9, roughness: 0.1 })
    };

    this.init();
  }

  init() {
    this.setupScene();
    this.setupLights();
    this.setupWaterGrid();
    this.setupControls();
    this.setupUI();

    // 1. Instantly build parametric 3D model (0ms delay, works 100% offline or on slow network)
    this.buildProceduralModel();

    // 2. Start animation & rendering loop immediately
    this.animate();

    // 3. Try loading high-poly STL CAD assembly in background
    this.loadSTLModelAsync();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090E);

    const width = this.container.clientWidth || this.container.getBoundingClientRect().width || 600;
    const height = this.container.clientHeight || this.container.getBoundingClientRect().height || 540;
    const aspect = (width > 0 && height > 0) ? (width / height) : (600 / 540);

    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    this.camera.position.set(160, 140, 200);

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

    // Multi-pass resize triggers to ensure 3D canvas expands properly as DOM renders
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(120, 200, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x0EA5E9, 0.8);
    rimLight.position.set(-150, -50, -100);
    this.scene.add(rimLight);

    const yellowLight = new THREE.PointLight(0xFACC15, 1.5, 300);
    yellowLight.position.set(0, 50, 0);
    this.scene.add(yellowLight);
  }

  setupWaterGrid() {
    const gridHelper = new THREE.GridHelper(500, 40, 0x0EA5E9, 0x1E293B);
    gridHelper.position.y = -15;
    gridHelper.material.opacity = 0.4;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xFACC15,
      dashSize: 2,
      gapSize: 1,
      scale: 1
    });
    const points = [new THREE.Vector3(25, 16, 0), new THREE.Vector3(25, 0, 0)];
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
    this.controls.minDistance = 50;
    this.controls.maxDistance = 600;
    this.controls.target.set(0, 20, 0);
  }

  // Instantly constructs parametric 3D catamaran model in 0 milliseconds (Network Independent)
  buildProceduralModel() {
    this.usingProceduralModel = true;
    this.parts = {};

    while(this.modelGroup.children.length > 0) {
      this.modelGroup.remove(this.modelGroup.children[0]);
    }
    while(this.sensorPodGroup.children.length > 0) {
      this.sensorPodGroup.remove(this.sensorPodGroup.children[0]);
    }

    // 1. Port & Starboard Twin Hulls
    const hullGeo = new THREE.CylinderGeometry(7, 11, 140, 16);
    hullGeo.rotateZ(Math.PI / 2);
    hullGeo.scale(1, 0.6, 1);

    const portHull = new THREE.Mesh(hullGeo, this.materials.hull);
    portHull.position.set(0, 0, -45);
    portHull.castShadow = true;
    portHull.receiveShadow = true;

    const stbdHull = new THREE.Mesh(hullGeo, this.materials.hull);
    stbdHull.position.set(0, 0, 45);
    stbdHull.castShadow = true;
    stbdHull.receiveShadow = true;

    this.modelGroup.add(portHull);
    this.modelGroup.add(stbdHull);
    this.parts['hull_port'] = portHull;
    this.parts['hull_starboard'] = stbdHull;

    // Streamlined Bow Cones
    const coneGeo = new THREE.ConeGeometry(9, 25, 16);
    coneGeo.rotateZ(-Math.PI / 2);
    coneGeo.scale(0.7, 1, 1);

    const portBow = new THREE.Mesh(coneGeo, this.materials.hull);
    portBow.position.set(75, 0, -45);
    const stbdBow = new THREE.Mesh(coneGeo, this.materials.hull);
    stbdBow.position.set(75, 0, 45);
    this.modelGroup.add(portBow);
    this.modelGroup.add(stbdBow);

    // 2. Crossbeams & Main Deck Platform
    const deckGeo = new THREE.BoxGeometry(110, 6, 94);
    const deckMesh = new THREE.Mesh(deckGeo, this.materials.deck);
    deckMesh.position.set(0, 10, 0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    this.modelGroup.add(deckMesh);
    this.parts['deck'] = deckMesh;

    // 3. Electronics Enclosure Bay
    const encGeo = new THREE.BoxGeometry(50, 22, 40);
    const encMesh = new THREE.Mesh(encGeo, this.materials.enclosure);
    encMesh.position.set(-10, 22, 0);
    encMesh.castShadow = true;
    this.modelGroup.add(encMesh);
    this.parts['enclosure'] = encMesh;

    // 4. Twin Solar Panels
    const solarGeo = new THREE.BoxGeometry(45, 2, 38);
    const solarPort = new THREE.Mesh(solarGeo, this.materials.solar);
    solarPort.position.set(15, 14, -24);
    solarPort.rotation.x = -0.12;
    const solarStbd = new THREE.Mesh(solarGeo, this.materials.solar);
    solarStbd.position.set(15, 14, 24);
    solarStbd.rotation.x = 0.12;
    this.modelGroup.add(solarPort);
    this.modelGroup.add(solarStbd);
    this.parts['solar'] = solarPort;

    // 5. Communication Mast & GNSS Dome
    const mastGeo = new THREE.CylinderGeometry(1.5, 2, 50);
    const mastMesh = new THREE.Mesh(mastGeo, this.materials.antennas);
    mastMesh.position.set(-25, 45, 0);
    this.modelGroup.add(mastMesh);
    this.parts['antennas'] = mastMesh;

    const gnssGeo = new THREE.SphereGeometry(6, 16, 16);
    gnssGeo.scale(1, 0.6, 1);
    const gnssMesh = new THREE.Mesh(gnssGeo, this.materials.gnss);
    gnssMesh.position.set(-25, 70, 0);
    this.modelGroup.add(gnssMesh);
    this.parts['gnss'] = gnssMesh;

    // 6. Winch System & Deployable Sensor Pod
    const winchGeo = new THREE.CylinderGeometry(8, 8, 16, 16);
    winchGeo.rotateX(Math.PI / 2);
    const winchMesh = new THREE.Mesh(winchGeo, this.materials.winch);
    winchMesh.position.set(25, 16, 0);
    this.modelGroup.add(winchMesh);
    this.parts['winch'] = winchMesh;

    // Deployable Sensor Pod
    const podBodyGeo = new THREE.CylinderGeometry(5, 5, 22, 16);
    const podBody = new THREE.Mesh(podBodyGeo, this.materials.sensorPod);
    const podCap = new THREE.Mesh(new THREE.ConeGeometry(5, 8, 16), this.materials.sensorPod);
    podCap.position.y = -15;
    podCap.rotation.x = Math.PI;
    
    this.sensorPodGroup.add(podBody);
    this.sensorPodGroup.add(podCap);
    this.sensorPodGroup.position.set(25, 0, 0);
    this.parts['sensor_pod'] = podBody;

    // 7. Dual Thrusters
    const thrusterGeo = new THREE.CylinderGeometry(5, 6, 20, 16);
    thrusterGeo.rotateZ(Math.PI / 2);
    const thrusterPort = new THREE.Mesh(thrusterGeo, this.materials.thrusters);
    thrusterPort.position.set(-65, -4, -45);
    const thrusterStbd = new THREE.Mesh(thrusterGeo, this.materials.thrusters);
    thrusterStbd.position.set(-65, -4, 45);
    this.modelGroup.add(thrusterPort);
    this.modelGroup.add(thrusterStbd);
    this.parts['thrusters'] = thrusterPort;

    // 8. Wind Turbine
    const turbineHub = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 8, 12), this.materials.windTurbine);
    turbineHub.rotation.x = Math.PI / 2;
    turbineHub.position.set(30, 48, 0);
    const bladeGeo = new THREE.BoxGeometry(2, 28, 0.5);
    const blade1 = new THREE.Mesh(bladeGeo, this.materials.windTurbine);
    blade1.position.set(30, 48, 0);
    this.windTurbineMesh = blade1;
    this.modelGroup.add(turbineHub);
    this.modelGroup.add(blade1);
    this.parts['wind_turbine'] = blade1;

    this.isLoaded = true;
    console.log('O-TREX Instant 3D Parametric CAD Model loaded (0ms delay)!');
  }

  loadSTLModelAsync() {
    if (typeof THREE.STLLoader === 'undefined') return;

    const loader = new THREE.STLLoader();
    const stlPartsConfig = [
      { file: 'O-TREX_hull_port_1to10.stl', key: 'hull_port', mat: this.materials.hull },
      { file: 'O-TREX_hull_starboard_1to10.stl', key: 'hull_starboard', mat: this.materials.hull },
      { file: 'O-TREX_deck_and_beams_1to10.stl', key: 'deck', mat: this.materials.deck },
      { file: 'O-TREX_solar_panels_1to10.stl', key: 'solar', mat: this.materials.solar },
      { file: 'O-TREX_wind_turbine_1to10.stl', key: 'wind_turbine', mat: this.materials.windTurbine },
      { file: 'O-TREX_thrusters_1to10.stl', key: 'thrusters', mat: this.materials.thrusters },
      { file: 'O-TREX_winch_system_1to10.stl', key: 'winch', mat: this.materials.winch },
      { file: 'O-TREX_sensor_pod_1to10.stl', key: 'sensor_pod', mat: this.materials.sensorPod, isPod: true },
      { file: 'O-TREX_gnss_1to10.stl', key: 'gnss', mat: this.materials.gnss },
      { file: 'O-TREX_antennas_1to10.stl', key: 'antennas', mat: this.materials.antennas },
      { file: 'O-TREX_electronics_enclosure_1to10.stl', key: 'enclosure', mat: this.materials.enclosure }
    ];

    let loadedCount = 0;
    const totalParts = stlPartsConfig.length;
    const newModelGroup = new THREE.Group();
    const newSensorPodGroup = new THREE.Group();
    const newParts = {};
    let newTurbineMesh = null;

    // Timeout safety net (3 seconds for slow networks)
    const timeoutTimer = setTimeout(() => {
      if (!this.stlLoaded) {
        console.log('Slow network detected. Retaining instant parametric 3D model.');
        this.updateNetworkBadge('3D MODE: INSTANT CAD SIMULATION (SLOW NETWORK ACTIVE)');
      }
    }, 3000);

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
            newSensorPodGroup.add(mesh);
            newParts[config.key] = mesh;
          } else {
            newModelGroup.add(mesh);
            newParts[config.key] = mesh;
            if (config.key === 'wind_turbine') {
              newTurbineMesh = mesh;
            }
          }

          loadedCount++;

          if (loadedCount === totalParts) {
            clearTimeout(timeoutTimer);
            this.stlLoaded = true;
            this.usingProceduralModel = false;

            // Swap to high-poly CAD geometry seamlessly
            this.scene.remove(this.modelGroup);
            this.scene.remove(this.sensorPodGroup);

            this.modelGroup = newModelGroup;
            this.sensorPodGroup = newSensorPodGroup;
            this.parts = newParts;
            if (newTurbineMesh) this.windTurbineMesh = newTurbineMesh;

            this.scene.add(this.modelGroup);
            this.scene.add(this.sensorPodGroup);
            this.sensorPodGroup.position.set(0, 0, 0);
            this.sensorPodGroup.position.y = this.currentPodY;

            this.updateNetworkBadge('3D MODE: HIGH-PRECISION CAD ASSEMBLY ONLINE');
            console.log('O-TREX High-Poly STL CAD Model loaded & swapped successfully!');
          }
        },
        undefined,
        (error) => {
          clearTimeout(timeoutTimer);
          this.updateNetworkBadge('3D MODE: INSTANT CAD SIMULATION ONLINE');
        }
      );
    });
  }

  updateNetworkBadge(text) {
    const teleMode = document.getElementById('teleModeStatus');
    if (teleMode) teleMode.textContent = text;
  }

  setupUI() {
    // Add Control Overlay Toolbar onto the 3D Canvas Container
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
        <button class="sim-btn active" id="btnToggleRotate"><i class="fa-solid fa-rotate"></i> ROTATE</button>
      </div>
    `;

    // Live Telemetry Readout Box Overlay
    const telemetryBox = document.createElement('div');
    telemetryBox.className = 'sim-3d-telemetry';
    telemetryBox.innerHTML = `
      <div class="tele-line"><span class="tele-dot"></span> <strong>O-TREX 3D CAD SIMULATION</strong></div>
      <div class="tele-val">PITCH: <span id="telePitch">+0.4°</span> | ROLL: <span id="teleRoll">-0.2°</span></div>
      <div class="tele-val">POD DEPTH: <span id="telePodDepth" class="text-yellow">0.0 m</span></div>
      <div class="tele-val"><span id="teleModeStatus" class="text-yellow" style="font-size: 0.75rem;">3D MODE: INSTANT CAD SIMULATION ONLINE</span></div>
    `;

    this.container.appendChild(toolbar);
    this.container.appendChild(telemetryBox);

    // Bind Toolbar Events
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
    const duration = 1000;
    let targetPos = new THREE.Vector3();
    let targetLook = new THREE.Vector3(0, 20, 0);

    switch(view) {
      case 'top':
        targetPos.set(0, 260, 0.1);
        break;
      case 'front':
        targetPos.set(0, 20, 220);
        break;
      case 'side':
        targetPos.set(220, 20, 0);
        break;
      case 'pod':
        targetPos.set(40, -40, 100);
        targetLook.set(0, -30, 0);
        break;
      case 'iso':
      default:
        targetPos.set(160, 140, 200);
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
      this.targetPodY = -60; // Lower pod 60 units downwards
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

    // Animate Pod lowering / raising
    if (Math.abs(this.currentPodY - this.targetPodY) > 0.1) {
      this.currentPodY += (this.targetPodY - this.currentPodY) * 0.05;
      this.sensorPodGroup.position.y = this.currentPodY;

      if (this.tetherLine) {
        const positions = this.tetherLine.geometry.attributes.position.array;
        positions[3] = 25; // X
        positions[4] = this.currentPodY; // Y
        positions[5] = 0; // Z
        this.tetherLine.geometry.attributes.position.needsUpdate = true;
        this.tetherLine.computeLineDistances();
      }
    }

    // Animate Wind Turbine rotation
    if (this.windTurbineMesh) {
      this.windTurbineMesh.rotation.z += 0.08;
    }

    // Wave Pitch / Roll Simulation
    if (this.isLoaded) {
      const time = performance.now() * 0.001;
      const pitch = Math.sin(time * 1.2) * 0.03;
      const roll = Math.cos(time * 1.5) * 0.02;
      
      this.modelGroup.rotation.z = roll;
      this.modelGroup.rotation.x = pitch;

      const pitchDeg = (pitch * (180 / Math.PI)).toFixed(1);
      const rollDeg = (roll * (180 / Math.PI)).toFixed(1);
      
      const pitchEl = document.getElementById('telePitch');
      const rollEl = document.getElementById('teleRoll');
      if (pitchEl) pitchEl.textContent = `${pitchDeg >= 0 ? '+' : ''}${pitchDeg}°`;
      if (rollEl) rollEl.textContent = `${rollDeg >= 0 ? '+' : ''}${rollDeg}°`;
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
