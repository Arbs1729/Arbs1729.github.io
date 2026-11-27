(() => {
  const canvas = document.querySelector('#space-atmosphere');
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const stars = [];
  const cityLights = [];
  const clouds = [];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;
  let last = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let pointerTargetX = 0.5;
  let pointerTargetY = 0.5;
  let scrollY = window.scrollY;
  let seed = 1729;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const motionOff = () => reduced.matches || document.documentElement.dataset.motion === 'off';

  const getPhase = () => {
    const cssVal = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sky-phase'));
    if (Number.isFinite(cssVal)) return clamp(cssVal, 0, 1);
    const explicit = document.documentElement.dataset.theme;
    if (explicit === 'light') return 0.12;
    if (explicit === 'dark') return 0.88;
    const h = new Date().getHours();
    return h >= 6 && h < 18 ? 0.14 : 0.88;
  };

  let currentPhase = getPhase();
  let targetPhase = currentPhase;

  const buildScene = () => {
    seed = 1729;
    stars.length = 0;
    const count = width < 600 ? 78 : 148;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: random(),
        y: random(),
        r: 0.35 + random() * 1.35,
        depth: 0.25 + random() * 1.45,
        phase: random() * Math.PI * 2,
        warmth: random() > 0.8,
        bright: random() > 0.78,
      });
    }

    // Deterministic clusters of glowing amber Earth city lights along the nightside curvature
    cityLights.length = 0;
    const clusters = [
      { angle: Math.PI * 1.14, rMul: 0.88, spread: 0.055, count: 14 },
      { angle: Math.PI * 1.29, rMul: 0.83, spread: 0.065, count: 18 },
      { angle: Math.PI * 1.46, rMul: 0.89, spread: 0.075, count: 22 },
      { angle: Math.PI * 1.66, rMul: 0.86, spread: 0.055, count: 14 },
    ];
    for (const c of clusters) {
      for (let i = 0; i < c.count; i++) {
        cityLights.push({
          angle: c.angle + (random() - 0.5) * c.spread * 2.2,
          rMul: c.rMul + (random() - 0.5) * 0.11,
          r: 0.7 + random() * 1.35,
          phase: random() * Math.PI * 2,
          gold: random() > 0.35,
        });
      }
    }

    // Drifting dayside cloud-deck ribbons curving across Earth's horizon
    clouds.length = 0;
    for (let i = 0; i < 6; i++) {
      clouds.push({
        startAngle: Math.PI * (1.06 + i * 0.14),
        span: 0.18 + random() * 0.18,
        rMul: 0.84 + random() * 0.11,
        thickness: 6 + random() * 12,
        speed: 0.000008 + random() * 0.000012,
      });
    }
  };

  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    ratio = Math.min(devicePixelRatio || 1, 1.35);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildScene();
    draw(performance.now());
  };

  const radialGlow = (x, y, radius, inner, mid, outer = 'rgba(0,0,0,0)') => {
    const g = context.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, inner);
    if (mid) g.addColorStop(0.45, mid);
    g.addColorStop(1, outer);
    context.fillStyle = g;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };

  const drawSolarGlare = (time, dayVis, termVis, px, py) => {
    const totalSun = clamp(dayVis + termVis * 0.85, 0, 1);
    if (totalSun <= 0.01) return;

    // Sun position arcs subtly lower as day moves toward the terminator sunset
    const sx = width * (0.14 + termVis * 0.18) + px * 0.45;
    const sy = height * (0.14 + termVis * 0.36) + py * 0.35;
    const r = Math.max(width, height) * (0.34 + termVis * 0.12);

    const coreCol = termVis > dayVis * 0.65
      ? `rgba(246, 152, 76, ${0.24 * totalSun})`
      : `rgba(255, 244, 206, ${0.34 * totalSun})`;
    const midCol = termVis > dayVis * 0.65
      ? `rgba(218, 92, 54, ${0.11 * totalSun})`
      : `rgba(116, 186, 232, ${0.12 * totalSun})`;
    radialGlow(sx, sy, r, coreCol, midCol);

    // Subtle anamorphic cupola glass glint
    const streakW = Math.min(width * 0.32, 340);
    const sg = context.createLinearGradient(sx - streakW, sy, sx + streakW, sy);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, termVis > 0.35
      ? `rgba(255, 198, 128, ${0.26 * totalSun})`
      : `rgba(255, 250, 232, ${0.22 * totalSun})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    context.strokeStyle = sg;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(sx - streakW, sy);
    context.lineTo(sx + streakW, sy);
    context.stroke();
  };

  const drawEarthFromOrbit = (time, phase, dayVis, termVis, nightVis, px, py) => {
    const drift = motionOff() ? 0 : Math.sin(time * 0.00008) * 24;
    const cx = width * 0.84 + drift - px * 0.35;
    const cy = height * 1.15 - py * 0.25;
    const rx = Math.max(width * 0.44, 340);
    const ry = Math.max(height * 0.31, 185);
    const tilt = -0.075;

    context.save();

    // 1. Atmospheric Scattering Halo above Earth's curved limb
    // Day: vivid Rayleigh cerulean-cobalt; Terminator: glowing amber-crimson sunrise band; Night: delicate emerald airglow
    if (dayVis > 0.02) {
      context.save();
      context.strokeStyle = `rgba(74, 168, 228, ${0.34 * dayVis})`;
      context.lineWidth = 16;
      context.beginPath();
      context.ellipse(cx, cy, rx + 7, ry + 7, tilt, Math.PI * 1.01, Math.PI * 1.98);
      context.stroke();
      context.strokeStyle = `rgba(148, 218, 252, ${0.52 * dayVis})`;
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(cx, cy, rx + 1, ry + 1, tilt, Math.PI * 1.01, Math.PI * 1.98);
      context.stroke();
      context.restore();
    }

    if (termVis > 0.02) {
      context.save();
      const tg = context.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.4, cy);
      tg.addColorStop(0, `rgba(255, 134, 62, ${0.52 * termVis})`);
      tg.addColorStop(0.5, `rgba(218, 86, 56, ${0.34 * termVis})`);
      tg.addColorStop(1, `rgba(78, 152, 210, ${0.22 * termVis})`);
      context.strokeStyle = tg;
      context.lineWidth = 14;
      context.beginPath();
      context.ellipse(cx, cy, rx + 5, ry + 5, tilt, Math.PI * 1.01, Math.PI * 1.98);
      context.stroke();
      context.restore();
    }

    if (nightVis > 0.02) {
      // Thin emerald-teal atmospheric airglow floating slightly above nightside limb (iconic ISS night view)
      context.save();
      context.strokeStyle = `rgba(82, 222, 186, ${0.2 * nightVis})`;
      context.lineWidth = 5;
      context.beginPath();
      context.ellipse(cx, cy, rx + 14, ry + 12, tilt, Math.PI * 1.04, Math.PI * 1.95);
      context.stroke();
      context.strokeStyle = `rgba(130, 240, 212, ${0.32 * nightVis})`;
      context.lineWidth = 1.25;
      context.beginPath();
      context.ellipse(cx, cy, rx + 14, ry + 12, tilt, Math.PI * 1.06, Math.PI * 1.92);
      context.stroke();
      context.restore();
    }

    // 2. Earth Body Gradient (Ocean cerulean day -> sunset shadow -> obsidian night)
    const bodyGrad = context.createRadialGradient(
      cx - rx * 0.34,
      cy - ry * 0.84,
      14,
      cx,
      cy,
      rx * 1.04
    );
    if (phase < 0.5) {
      bodyGrad.addColorStop(0, `rgba(74, 152, 206, ${0.26 * dayVis + 0.18 * termVis})`);
      bodyGrad.addColorStop(0.45, `rgba(42, 102, 148, ${0.18 * dayVis + 0.14 * termVis})`);
      bodyGrad.addColorStop(1, 'rgba(18, 42, 64, 0.02)');
    } else {
      bodyGrad.addColorStop(0, `rgba(232, 134, 68, ${0.18 * termVis + 0.08 * nightVis})`);
      bodyGrad.addColorStop(0.42, `rgba(22, 34, 48, ${0.42 * nightVis + 0.16 * termVis})`);
      bodyGrad.addColorStop(1, 'rgba(6, 10, 16, 0.06)');
    }

    context.fillStyle = bodyGrad;
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, tilt, Math.PI, Math.PI * 2);
    context.fill();

    // Crisp planet horizon line
    context.strokeStyle = phase < 0.5
      ? `rgba(46, 114, 158, ${0.32 * dayVis + 0.25 * termVis})`
      : `rgba(236, 174, 96, ${0.28 * nightVis + 0.35 * termVis})`;
    context.lineWidth = 1.2;
    context.stroke();

    // 3. Dayside Sunlit Cloud-Deck Ribbons curving across Earth's horizon
    if (dayVis > 0.05) {
      context.save();
      context.lineCap = 'round';
      for (const cl of clouds) {
        const shift = motionOff() ? 0 : time * cl.speed;
        const a0 = cl.startAngle + Math.sin(shift) * 0.05;
        context.strokeStyle = `rgba(255, 251, 240, ${0.24 * dayVis})`;
        context.lineWidth = cl.thickness;
        context.beginPath();
        context.ellipse(cx, cy, rx * cl.rMul, ry * cl.rMul, tilt, a0, a0 + cl.span);
        context.stroke();
      }
      context.restore();
    }

    // 4. Nightside Amber-Gold City Light Clusters shimmering along Earth's dark curvature
    if (nightVis > 0.05) {
      context.save();
      context.translate(cx, cy);
      context.rotate(tilt);
      for (const dot of cityLights) {
        const x = Math.cos(dot.angle) * rx * dot.rMul;
        const y = Math.sin(dot.angle) * ry * dot.rMul;
        if (y > 0) continue;
        const twinkle = motionOff() ? 0.8 : 0.62 + Math.sin(time * 0.0018 + dot.phase) * 0.32;
        const a = twinkle * nightVis * 0.85;
        context.fillStyle = dot.gold ? `rgba(250, 186, 98, ${a})` : `rgba(255, 228, 168, ${a * 0.78})`;
        context.beginPath();
        context.arc(x, y, dot.r, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }

    // 5. Outer Orbital Track & Pulsing Docking Beacon
    context.save();
    context.translate(cx, cy);
    context.rotate(tilt + (motionOff() ? 0 : Math.sin(time * 0.00006) * 0.01));
    context.setLineDash([2, 13]);
    context.lineDashOffset = motionOff() ? 0 : -time * 0.012;
    context.strokeStyle = phase < 0.5
      ? `rgba(44, 102, 138, ${0.18 + 0.1 * termVis})`
      : `rgba(235, 188, 114, ${0.18 * nightVis + 0.14 * termVis})`;
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(0, 0, rx * 1.12, ry * 1.1, 0, Math.PI * 1.03, Math.PI * 1.95);
    context.stroke();
    context.setLineDash([]);

    const beacon = motionOff() ? 0.55 : 0.5 + Math.sin(time * 0.003) * 0.3;
    context.fillStyle = phase < 0.5
      ? `rgba(184, 74, 39, ${beacon * 0.75})`
      : `rgba(246, 178, 92, ${beacon})`;
    context.beginPath();
    context.arc(-rx * 0.22, -ry * 1.07, 2.3, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.restore();
  };

  const drawTraffic = (time, phase, nightVis) => {
    if (motionOff()) return;
    const paths = [
      { duration: 8400, offset: 0, x0: -0.06, y0: 0.2, x1: 0.72, y1: 0.36, length: width < 600 ? 64 : 128, warm: true },
      { duration: 11600, offset: 0.46, x0: 1.06, y0: 0.58, x1: 0.34, y1: 0.42, length: width < 600 ? 48 : 96, warm: false },
    ];
    for (const path of paths) {
      const cycle = (time / path.duration + path.offset) % 1;
      if (cycle > 0.4) continue;
      const flight = cycle / 0.4;
      const ease = flight * flight * (3 - 2 * flight);
      const x = width * (path.x0 + (path.x1 - path.x0) * ease);
      const y = height * (path.y0 + (path.y1 - path.y0) * ease);
      const dx = width * (path.x1 - path.x0);
      const dy = height * (path.y1 - path.y0);
      const mag = Math.max(Math.hypot(dx, dy), 1);
      const ux = dx / mag;
      const uy = dy / mag;
      const alpha = Math.sin(flight * Math.PI) * (0.38 + 0.36 * nightVis);
      const g = context.createLinearGradient(x - ux * path.length, y - uy * path.length, x, y);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, path.warm
        ? (phase >= 0.5 ? `rgba(246,184,104,${alpha})` : `rgba(184,74,39,${alpha * 0.7})`)
        : (phase >= 0.5 ? `rgba(110,212,226,${alpha * 0.85})` : `rgba(46,112,152,${alpha * 0.65})`));
      context.strokeStyle = g;
      context.lineWidth = path.warm ? 1.65 : 1.15;
      context.beginPath();
      context.moveTo(x - ux * path.length, y - uy * path.length);
      context.lineTo(x, y);
      context.stroke();
      context.fillStyle = path.warm ? 'rgba(255,228,184,.82)' : 'rgba(202,246,246,.76)';
      context.beginPath();
      context.arc(x, y, 1.6, 0, Math.PI * 2);
      context.fill();
    }
  };

  const draw = time => {
    context.clearRect(0, 0, width, height);
    // Smoothly approach targetPhase for buttery drags
    currentPhase += (targetPhase - currentPhase) * (motionOff() ? 1 : 0.28);
    const phase = clamp(currentPhase, 0, 1);

    const dayVis = smoothstep(0.58, 0.08, phase);
    const nightVis = smoothstep(0.42, 0.88, phase);
    const termVis = clamp(1 - Math.abs(phase - 0.5) * 3.2, 0, 1);
    const starVis = smoothstep(0.14, 0.72, phase);

    const motionScale = motionOff() ? 0 : 1;
    pointerX += (pointerTargetX - pointerX) * 0.045;
    pointerY += (pointerTargetY - pointerY) * 0.045;
    const t = time * 0.0001 * motionScale;
    const px = (pointerX - 0.5) * 22 * motionScale;
    const py = (pointerY - 0.5) * 14 * motionScale + scrollY * 0.012 * motionScale;

    // 1. Subtle room-aware ambient sky washes & Milky Way band (Night)
    if (nightVis > 0.05) {
      radialGlow(
        width * (0.2 + Math.sin(t) * 0.03) + px,
        height * (0.24 + Math.cos(t * 1.2) * 0.03) + py,
        Math.max(width, height) * 0.5,
        `rgba(56, 98, 146, ${0.14 * nightVis})`,
        `rgba(98, 62, 118, ${0.06 * nightVis})`
      );
      radialGlow(
        width * (0.78 + Math.cos(t * 0.8) * 0.03) - px * 0.5,
        height * (0.34 + Math.sin(t) * 0.025) - py * 0.3,
        Math.max(width, height) * 0.42,
        `rgba(224, 144, 68, ${0.1 * nightVis})`,
        `rgba(44, 112, 134, ${0.045 * nightVis})`
      );
    }

    // 2. Solar limb corona & cupola glass glare (Day & Terminator)
    drawSolarGlare(time, dayVis, termVis, px, py);

    // 3. Curved Earth from Orbital Station POV (blue marble + clouds -> sunset fire -> city lights + teal airglow)
    drawEarthFromOrbit(time, phase, dayVis, termVis, nightVis, px, py);

    // 4. Orbital Starfield (faintest stars washed out by bright Earth albedo in Day; full crisp constellation in Night)
    for (const star of stars) {
      const visibility = star.bright ? (0.22 * dayVis + starVis) : starVis;
      if (visibility <= 0.04) continue;
      const driftX = time * 0.0055 * star.depth * motionScale;
      const x = (star.x * width + driftX + px * star.depth + width) % width;
      const driftY = Math.sin(time * 0.00026 + star.phase) * 7 * star.depth * motionScale;
      const y = (star.y * height + driftY + py * star.depth + height) % height;
      const pulse = motionOff() ? 0.78 : 0.56 + Math.sin(time * 0.0012 + star.phase) * 0.28;
      const alpha = clamp(pulse * visibility, 0, 0.95);
      context.fillStyle = star.warmth
        ? (phase >= 0.5 ? `rgba(248, 192, 116, ${alpha})` : `rgba(162, 92, 48, ${alpha * 0.65})`)
        : (phase >= 0.5 ? `rgba(222, 238, 244, ${alpha})` : `rgba(46, 92, 126, ${alpha * 0.62})`);
      context.beginPath();
      context.arc(x, y, star.r, 0, Math.PI * 2);
      context.fill();
    }

    // 5. Passing Orbital Satellites / Traffic
    drawTraffic(time, phase, nightVis);
  };

  const introBlocking = () => {
    const cl = document.documentElement.classList;
    return cl.contains('arrival-active') && !cl.contains('arrival-revealing');
  };

  const loop = time => {
    if (introBlocking()) {
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(loop);
    if (document.hidden || time - last < 42) return;
    last = time;
    draw(time);
  };

  const restart = () => {
    targetPhase = getPhase();
    cancelAnimationFrame(frame);
    frame = 0;
    if (introBlocking()) return;
    draw(performance.now());
    if (!motionOff()) frame = requestAnimationFrame(loop);
  };

  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  addEventListener('pointermove', event => {
    pointerTargetX = event.clientX / Math.max(innerWidth, 1);
    pointerTargetY = event.clientY / Math.max(innerHeight, 1);
  }, { passive: true });

  document.addEventListener('aryan:skyphase', event => {
    const p = Number(event.detail?.phase);
    if (Number.isFinite(p)) {
      targetPhase = clamp(p, 0, 1);
      if (motionOff() || !frame) {
        currentPhase = targetPhase;
        draw(performance.now());
      }
    }
  });
  document.addEventListener('aryan:motionchange', restart);
  document.addEventListener('aryan:themechange', restart);
  document.addEventListener('aryan:arrivalreveal', restart);
  document.addEventListener('aryan:arrivalcomplete', restart);
  document.addEventListener('aryan:introreplay', () => { cancelAnimationFrame(frame); frame = 0; });
  reduced.addEventListener('change', restart);
  systemDark.addEventListener('change', restart);

  resize();
  restart();
})();
