/* ==========================================================================
   O-TREX: OCEANIC TRACKING & RESPONSIVE EXPLORER
   INTERACTIVE APPLICATION ENGINE
   TEAM CODE ZEPHYRA | SMART INDIA HACKATHON 2026
   ========================================================================== */

function runOTrexInit() {
  initSitePreloader();
  initNavbar();
  initBlueprintViewer();
  initMissionStepper();
  initContactForm();
  initTelemetryCanvas();
  initScrollReveal();
  initLiveSimulationHandlers();

  // Initialize 3D CAD Simulation Engine in Hero
  if (window.initOTrex3D) {
    window.initOTrex3D('hero3dSimulationContainer');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runOTrexInit);
} else {
  runOTrexInit();
}

/* --------------------------------------------------------------------------
   01. Navbar & Mobile Navigation
   -------------------------------------------------------------------------- */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-link');

  // Sticky Scroll Class
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active Section Tracking
    let current = '';
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Mobile Menu Toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      const icon = hamburger.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-xmark');
      }
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
      });
    });
  }
}

/* --------------------------------------------------------------------------
   02. Interactive Blueprint Viewer
   -------------------------------------------------------------------------- */
function initBlueprintViewer() {
  const viewBtns = document.querySelectorAll('.view-btn');
  const blueprintImg = document.getElementById('blueprintTargetImg');
  const activeLabel = document.getElementById('currentViewLabel');

  if (!blueprintImg || !viewBtns.length) return;

  // Position transform profiles for the combined blueprint sheet
  const viewProfiles = {
    'all': { transform: 'scale(1) translate(0, 0)', label: 'GENERAL ARRANGEMENT — ALL VIEWS' },
    'top': { transform: 'scale(2.2) translate(35%, 32%)', label: 'TOP VIEW — SCALE 1:10 (SOLAR & WIND)' },
    'front': { transform: 'scale(2.4) translate(-10%, 25%)', label: 'FRONT VIEW — SCALE 1:10 (THRUSTERS & HULL)' },
    'side': { transform: 'scale(2.2) translate(-35%, 28%)', label: 'SIDE VIEW — SCALE 1:10 (COMMUNICATION MAST)' },
    'iso': { transform: 'scale(2.2) translate(30%, -20%)', label: 'ISOMETRIC VIEW — THREE-DIMENSIONAL' },
    'exploded': { transform: 'scale(2.2) translate(-10%, -15%)', label: 'ANNOTATED COMPONENTS — EXPLODED LAYOUT' },
    'underwater': { transform: 'scale(2.4) translate(0%, -35%)', label: 'UNDERWATER VIEW — SENSOR POD DEPLOYMENT' }
  };

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const viewMode = btn.getAttribute('data-view');
      const profile = viewProfiles[viewMode] || viewProfiles['all'];

      blueprintImg.style.transform = profile.transform;
      if (activeLabel) {
        activeLabel.textContent = profile.label;
      }
    });
  });
}

/* --------------------------------------------------------------------------
   03. Interactive Mission Flow Stepper
   -------------------------------------------------------------------------- */
const missionStepsData = {
  1: {
    title: '01. DEPLOYMENT & INITIALIZATION',
    desc: 'Launch O-TREX into marine environment. Self-check sensors, power levels, GNSS fix, and establish satellite connectivity baseline.',
    status: 'SYSTEMS ONLINE | GNSS FIXED | BATTERY 100%'
  },
  2: {
    title: '02. AUTONOMOUS WAYPOINT NAVIGATION',
    desc: 'Pixhawk 6X autopilot executes precise GPS route planning while IMU (BNO055) handles orientation and wave stabilization.',
    status: 'WAYPOINT ACTIVE | BLDC THRUSTERS ENGAGED'
  },
  3: {
    title: '03. CONTINUOUS SURFACE MONITORING',
    desc: 'Raspberry Pi 5 continuously samples surface temperature, salinity, atmospheric conditions, and water clarity metrics.',
    status: 'SURFACE SAMPLING | TELEMETRY RECORDING'
  },
  4: {
    title: '04. ANOMALY DETECTION EVALUATION',
    desc: 'Mission computer evaluates rolling 30-min baseline. Triggers profile if temperature gradient > 0.3°C/km OR salinity > 0.1 PSU.',
    status: 'THRESHOLD CHECK: 0.3°C/km | 0.1 PSU DEVIATION'
  },
  5: {
    title: '05. TARGETED VERTICAL PROFILING',
    desc: 'Electric winch lowers tethered sensor pod (CTD, DO, pH, Turbidity, Depth) to log vertical ocean profile down to target depth.',
    status: 'WINCH DEPLOYING POD | DEPTH TELEMETRY'
  },
  6: {
    title: '06. DATA STORE & CONTINUOUS RESUME',
    desc: 'Log payload locally during blackouts. Sync via Iridium 9603 when link available, then resume surface navigation loop.',
    status: 'STORE-AND-FORWARD ACTIVE | RESUMING ROUTE'
  }
};

function initMissionStepper() {
  const stepCards = document.querySelectorAll('.step-card');
  const detailsTitle = document.getElementById('stepDetailsTitle');
  const detailsDesc = document.getElementById('stepDetailsDesc');
  const detailsStatus = document.getElementById('stepDetailsStatus');

  if (!stepCards.length) return;

  stepCards.forEach(card => {
    card.addEventListener('click', () => {
      stepCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const stepId = card.getAttribute('data-step');
      const data = missionStepsData[stepId];

      if (data) {
        if (detailsTitle) detailsTitle.textContent = data.title;
        if (detailsDesc) detailsDesc.textContent = data.desc;
        if (detailsStatus) detailsStatus.textContent = data.status;
      }
    });
  });
}

/* --------------------------------------------------------------------------
   05. Telemetry Canvas (Digital Simulation Preview Canvas)
   -------------------------------------------------------------------------- */
function initTelemetryCanvas() {
  const canvas = document.getElementById('telemetryCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = canvas.parentElement.clientWidth;
  let height = canvas.height = canvas.parentElement.clientHeight || 260;

  window.addEventListener('resize', () => {
    if (!canvas.parentElement) return;
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight || 260;
  });

  let offset = 0;
  function render() {
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Telemetry Sine Wave 1 (Temperature Profile)
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width; x += 5) {
      const y = height / 2 + Math.sin((x + offset) * 0.02) * 40 + Math.cos((x + offset) * 0.01) * 15;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Telemetry Sine Wave 2 (Salinity Anomaly)
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < width; x += 5) {
      const y = height / 2 + Math.cos((x - offset * 1.5) * 0.015) * 50;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    offset += 1.5;
    requestAnimationFrame(render);
  }

  render();
}

/* --------------------------------------------------------------------------
   06. Contact Form Handler
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const alertBox = document.getElementById('formAlert');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('contactName')?.value;
    const email = document.getElementById('contactEmail')?.value;
    const message = document.getElementById('contactMessage')?.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> TRANSMITTING TO CODEZEPHYRA@GMAIL.COM...';
    }

    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.backgroundColor = '#1E293B';
      alertBox.style.color = '#FACC15';
      alertBox.style.border = '1px solid #FACC15';
      alertBox.innerHTML = '<i class="fa-solid fa-satellite-dish fa-spin"></i> TRANSMITTING MESSAGE TO CODEZEPHYRA@GMAIL.COM...';
    }

    try {
      const response = await fetch('https://formsubmit.co/ajax/codezephyra@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
          _replyto: email,
          _subject: `O-TREX Official Contact Inquiry from ${name}`,
          _template: "table",
          _autorespond: "false"
        })
      });

      if (response.ok) {
        if (alertBox) {
          alertBox.style.backgroundColor = '#065F46';
          alertBox.style.color = '#34D399';
          alertBox.style.border = '1px solid #10B981';
          alertBox.innerHTML = '<i class="fa-solid fa-circle-check"></i> SUCCESS! MESSAGE SENT DIRECTLY TO CODEZEPHYRA@GMAIL.COM';
        }
        form.reset();
      } else {
        throw new Error('FormSubmit endpoint error');
      }
    } catch (err) {
      // Direct mailto fallback if offline or network error
      window.location.href = `mailto:codezephyra@gmail.com?subject=${encodeURIComponent('[O-TREX] Inquiry from ' + name)}&body=${encodeURIComponent(message + '\n\nSender: ' + name + ' (' + email + ')')}`;
      if (alertBox) {
        alertBox.style.backgroundColor = '#1E293B';
        alertBox.style.color = '#FACC15';
        alertBox.style.border = '1px solid #FACC15';
        alertBox.innerHTML = '<i class="fa-solid fa-envelope"></i> OPENED MAIL CLIENT TO TRANSMIT TO CODEZEPHYRA@GMAIL.COM';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'SEND MESSAGE TO CODEZEPHYRA@GMAIL.COM <i class="fa-solid fa-paper-plane"></i>';
      }
      setTimeout(() => {
        if (alertBox) alertBox.style.display = 'none';
      }, 7000);
    }
  });
}

/* --------------------------------------------------------------------------
   07. Scroll Reveal Animation
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.glass-card, .problem-card, .param-card, .tech-cat-card, .gate-card, .gallery-item');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    observer.observe(el);
  });
}

/* --------------------------------------------------------------------------
   08. Live Simulation Button & Modal Handler
   -------------------------------------------------------------------------- */
function initLiveSimulationHandlers() {
  const liveBtns = document.querySelectorAll('.btn-live-sim, a[href*="o-trex.vercel.app"]');
  const simModal = document.getElementById('liveSimModal');
  const closeModal = document.getElementById('closeSimModal');
  const simContainer = document.getElementById('hero3dSimulationContainer');

  liveBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      // 1. Highlight & scroll to 3D Simulation container on page
      if (simContainer) {
        simContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        simContainer.style.boxShadow = '0 0 35px #FACC15, 0 0 70px rgba(250, 204, 21, 0.4)';
        setTimeout(() => {
          simContainer.style.boxShadow = '';
        }, 2500);

        if (window.trex3d) {
          window.trex3d.onWindowResize();
          window.trex3d.setCameraView('iso');
        }
      }

      // 2. Open Fullscreen Interactive Simulation Modal
      if (simModal) {
        simModal.classList.add('active');
      }

      // 3. Open in new tab cleanly
      const targetUrl = btn.getAttribute('href') || 'https://o-trex.vercel.app/';
      if (targetUrl && targetUrl.startsWith('http')) {
        try {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } catch(err) {
          console.log('Window open fallback');
        }
      }
    });
  });

  if (closeModal && simModal) {
    closeModal.addEventListener('click', () => {
      simModal.classList.remove('active');
    });

    simModal.addEventListener('click', (e) => {
      if (e.target === simModal) {
        simModal.classList.remove('active');
      }
    });
  }
}

/* --------------------------------------------------------------------------
   09. Full-Page Site Telemetry Preloader (Low Network Proof)
   -------------------------------------------------------------------------- */
function initSitePreloader() {
  const preloader = document.getElementById('sitePreloader');
  const barFill = document.getElementById('preloaderFill');
  const percentText = document.getElementById('preloaderPercent');
  const statusText = document.getElementById('preloaderText');

  if (!preloader) return;

  const statusMessages = [
    'INITIALIZING LOCAL 3D CAD ENGINE...',
    'LOADING POLAR OCEAN TELEMETRY PIPELINE...',
    'CONFIGURING PIXHAWK 6X AUTOPILOT STACK...',
    'SYNCHRONIZING CATAMARAN HYDRODYNAMICS...',
    'O-TREX SYSTEM READY FOR DEPLOYMENT'
  ];

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 18) + 12;
    if (progress > 100) progress = 100;

    if (barFill) barFill.style.width = `${progress}%`;
    if (percentText) percentText.textContent = `${progress}%`;

    const msgIndex = Math.min(Math.floor((progress / 100) * statusMessages.length), statusMessages.length - 1);
    if (statusText && statusMessages[msgIndex]) {
      statusText.innerHTML = `<i class="fa-solid fa-satellite-dish fa-spin"></i> ${statusMessages[msgIndex]}`;
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        preloader.classList.add('fade-out');
        setTimeout(() => {
          preloader.style.display = 'none';
        }, 600);
      }, 350);
    }
  }, 90);
}
