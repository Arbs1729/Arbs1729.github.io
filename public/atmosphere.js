(() => {
  const canvas = document.querySelector('#space-atmosphere');
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const stars = [];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;
  let last = 0;
  let pointerX = .5;
  let pointerY = .5;
  let pointerTargetX = .5;
  let pointerTargetY = .5;
  let scrollY = window.scrollY;
  let seed = 1729;

  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const motionOff = () => reduced.matches || document.documentElement.dataset.motion === 'off';
  const isDark = () => {
    const explicit = document.documentElement.dataset.theme;
    return explicit === 'dark' || (!explicit && systemDark.matches);
  };

  const buildStars = () => {
    stars.length = 0;
    const count = width < 600 ? 64 : 118;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: random(),
        y: random(),
        r: .35 + random() * 1.25,
        depth: .25 + random() * 1.4,
        phase: random() * Math.PI * 2,
        warmth: random() > .84
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
    buildStars();
    draw(performance.now());
  };

  const nebula = (x, y, radius, inner, outer) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(.48, outer);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };

  const drawPlanet = (time, dark) => {
    const drift = motionOff() ? 0 : Math.sin(time * .0001) * 34;
    const cx = width * .89 + drift;
    const cy = height * 1.14;
    const radiusX = Math.max(width * .28, 260);
    const radiusY = Math.max(height * .22, 150);
    const fill = context.createRadialGradient(cx - radiusX * .32, cy - radiusY * .7, 10, cx, cy, radiusX);
    fill.addColorStop(0, dark ? 'rgba(229,120,69,.16)' : 'rgba(192,83,45,.09)');
    fill.addColorStop(.55, dark ? 'rgba(35,101,122,.11)' : 'rgba(44,116,132,.07)');
    fill.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = fill;
    context.beginPath();
    context.ellipse(cx, cy, radiusX, radiusY, -.08, Math.PI, Math.PI * 2);
    context.fill();
    context.strokeStyle = dark ? 'rgba(111,210,218,.2)' : 'rgba(38,105,116,.14)';
    context.lineWidth = 1.2;
    context.stroke();

    context.strokeStyle = dark ? 'rgba(239,143,89,.09)' : 'rgba(151,70,39,.08)';
    context.beginPath();
    context.ellipse(cx, cy, radiusX * 1.18, radiusY * .42, -.08, Math.PI * 1.04, Math.PI * 1.94);
    context.stroke();
  };

  const drawOrbitalBand = (time, dark) => {
    const cx = width * .86;
    const cy = height * 1.11;
    const rx = Math.max(width * .38, 330);
    const ry = Math.max(height * .2, 145);
    context.save();
    context.translate(cx, cy);
    context.rotate(-.08 + Math.sin(time * .00007) * .012);
    context.setLineDash([2, 13]);
    context.lineDashOffset = motionOff() ? 0 : -time * .012;
    context.strokeStyle = dark ? 'rgba(117,213,221,.14)' : 'rgba(36,105,116,.1)';
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(0, 0, rx, ry, 0, Math.PI * 1.02, Math.PI * 1.96);
    context.stroke();
    context.setLineDash([]);
    const beacon = motionOff() ? .38 : .45 + Math.sin(time * .003) * .22;
    context.fillStyle = dark ? `rgba(244,161,101,${beacon})` : `rgba(151,70,39,${beacon * .55})`;
    context.beginPath();
    context.arc(-rx * .18, -ry * .93, 2.1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawTraffic = (time, dark) => {
    if (motionOff()) return;
    const paths = [
      { duration: 7600, offset: 0, x0: -.08, y0: .2, x1: .72, y1: .38, length: width < 600 ? 68 : 132, warm: true },
      { duration: 10900, offset: .46, x0: 1.08, y0: .64, x1: .35, y1: .48, length: width < 600 ? 48 : 96, warm: false },
    ];
    for (const path of paths) {
      const cycle = (time / path.duration + path.offset) % 1;
      if (cycle > .42) continue;
      const flight = cycle / .42;
      const ease = flight * flight * (3 - 2 * flight);
      const x = width * (path.x0 + (path.x1 - path.x0) * ease);
      const y = height * (path.y0 + (path.y1 - path.y0) * ease);
      const dx = width * (path.x1 - path.x0);
      const dy = height * (path.y1 - path.y0);
      const magnitude = Math.max(Math.hypot(dx, dy), 1);
      const ux = dx / magnitude;
      const uy = dy / magnitude;
      const alpha = Math.sin(flight * Math.PI) * .65;
      const gradient = context.createLinearGradient(x - ux * path.length, y - uy * path.length, x, y);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, path.warm
        ? (dark ? `rgba(244,172,109,${alpha})` : `rgba(142,65,35,${alpha * .5})`)
        : (dark ? `rgba(112,221,228,${alpha * .82})` : `rgba(28,103,116,${alpha * .45})`));
      context.strokeStyle = gradient;
      context.lineWidth = path.warm ? 1.8 : 1.25;
      context.beginPath();
      context.moveTo(x - ux * path.length, y - uy * path.length);
      context.lineTo(x, y);
      context.stroke();
      context.fillStyle = path.warm ? 'rgba(255,221,176,.78)' : 'rgba(201,247,244,.72)';
      context.beginPath();
      context.arc(x, y, 1.7, 0, Math.PI * 2);
      context.fill();
    }
  };

  const draw = time => {
    context.clearRect(0, 0, width, height);
    const dark = isDark();
    const motionScale = motionOff() ? 0 : 1;
    pointerX += (pointerTargetX - pointerX) * .045;
    pointerY += (pointerTargetY - pointerY) * .045;
    const t = time * .00011 * motionScale;
    const px = (pointerX - .5) * 22 * motionScale;
    const py = (pointerY - .5) * 14 * motionScale + scrollY * .012 * motionScale;

    nebula(
      width * (.18 + Math.sin(t) * .04) + px,
      height * (.24 + Math.cos(t * 1.3) * .035) + py,
      Math.max(width, height) * .48,
      dark ? 'rgba(52,92,139,.13)' : 'rgba(61,126,145,.07)',
      dark ? 'rgba(97,52,117,.06)' : 'rgba(179,94,62,.035)'
    );
    nebula(
      width * (.82 + Math.cos(t * .8) * .035) - px * .6,
      height * (.38 + Math.sin(t) * .03) - py * .35,
      Math.max(width, height) * .38,
      dark ? 'rgba(200,79,65,.1)' : 'rgba(192,94,55,.055)',
      dark ? 'rgba(47,112,130,.045)' : 'rgba(42,108,124,.025)'
    );

    drawPlanet(time, dark);
    drawOrbitalBand(time, dark);

    for (const star of stars) {
      const driftX = time * .0065 * star.depth * motionScale;
      const x = (star.x * width + driftX + px * star.depth + width) % width;
      const driftY = Math.sin(time * .00028 + star.phase) * 8 * star.depth * motionScale;
      const y = (star.y * height + driftY + py * star.depth + height) % height;
      const pulse = motionOff() ? .72 : .5 + Math.sin(time * .0012 + star.phase) * .25;
      context.fillStyle = star.warmth
        ? (dark ? 'rgba(246,154,96,' + pulse + ')' : 'rgba(153,70,38,' + pulse * .48 + ')')
        : (dark ? 'rgba(214,236,228,' + pulse + ')' : 'rgba(35,70,78,' + pulse * .43 + ')');
      context.beginPath();
      context.arc(x, y, star.r, 0, Math.PI * 2);
      context.fill();
    }

    drawTraffic(time, dark);
  };

  const loop = time => {
    frame = requestAnimationFrame(loop);
    if (document.hidden || time - last < 42) return;
    last = time;
    draw(time);
  };

  const restart = () => {
    cancelAnimationFrame(frame);
    draw(performance.now());
    if (!motionOff()) frame = requestAnimationFrame(loop);
  };

  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  addEventListener('pointermove', event => {
    pointerTargetX = event.clientX / Math.max(innerWidth, 1);
    pointerTargetY = event.clientY / Math.max(innerHeight, 1);
  }, { passive: true });
  document.addEventListener('aryan:motionchange', restart);
  document.addEventListener('aryan:themechange', restart);
  reduced.addEventListener('change', restart);
  systemDark.addEventListener('change', restart);

  resize();
  restart();
})();
