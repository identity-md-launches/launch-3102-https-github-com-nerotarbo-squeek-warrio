import { useEffect, useRef } from 'react';
import { seeded } from '../game/battle';
import {
  ambientDust, drawDepthBlur, drawFog, drawLightShafts, drawMistBands,
  drawVignette, emitHit, ParticleSystem, VH, VW,
} from '../game/effects';

interface Props {
  stage: number;
  paused: boolean;
  hurt: Set<string>;
}

/** Decorative only: names, statistics, targeting and orders remain native DOM controls. */
export function BattleScene({ stage, paused, hurt }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hits = useRef(hurt);
  useEffect(() => { hits.current = hurt; }, [hurt]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const image = new Image();
    const backdrop = document.createElement('canvas');
    const backdropCtx = backdrop.getContext('2d')!;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rng = seeded(2026 + stage);
    const particles = new ParticleSystem();
    let frame = 0;
    let previous = 0;
    let time = 0;
    let lastHits: Set<string> | null = null;
    let disposed = false;
    let width = 0;
    let height = 0;
    let ratio = 1;

    // Seed visible dust immediately, including in the still/reduced-motion scene.
    for (let i = 0; i < 30; i++) {
      particles.spawn({ x: rng() * VW, y: rng() * VH, vx: -6 + rng() * 8, vy: -3 - rng() * 4,
        life: 3 + rng() * 3, maxLife: 6, size: 1 + rng() * 1.5, color: '#ffe9b0', kind: 'dust' });
    }

    const prepareBackdrop = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = backdrop.width = Math.max(1, Math.round(width * ratio));
      canvas.height = backdrop.height = Math.max(1, Math.round(height * ratio));
      backdropCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      backdropCtx.fillStyle = '#26301f';
      backdropCtx.fillRect(0, 0, width, height);
      if (!image.naturalWidth || !width || !height) return;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const sw = width / scale;
      const sh = height / scale;
      const paint = () => backdropCtx.drawImage(image, (image.naturalWidth - sw) / 2,
        (image.naturalHeight - sh) / 2, sw, sh, 0, 0, width, height);
      paint();
      // Cache genuine defocus at the far horizon and near foreground; units stay sharp.
      for (const [y, h] of [[0, height * 0.17], [height * 0.88, height * 0.12]]) {
        backdropCtx.save();
        backdropCtx.beginPath();
        backdropCtx.rect(0, y, width, h);
        backdropCtx.clip();
        backdropCtx.filter = 'blur(3px)';
        paint();
        backdropCtx.restore();
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(backdrop, 0, 0);
      ctx.setTransform(width * ratio / VW, 0, 0, height * ratio / VH, 0, 0);
      drawLightShafts(ctx, time, stage !== 2);
      drawFog(ctx, time);
      drawMistBands(ctx, time, VH * 0.7, 'rgba(220,225,235,ALPHA)', 0.12);
      drawDepthBlur(ctx, image, VH * 0.72);
      particles.draw(ctx);
      drawVignette(ctx, stage === 2 ? 'cool' : 'warm');
    };

    const animate = (now: number) => {
      if (disposed || paused || motion.matches || document.hidden) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      time += dt;
      if (hits.current !== lastHits) {
        lastHits = hits.current;
        for (const id of lastHits) {
          const partyIndex = ['pip', 'mochi', 'bramble'].indexOf(id);
          emitHit(particles, partyIndex >= 0 ? VW * (partyIndex + 1) / 4 : VW * (0.3 + rng() * 0.4),
            VH * (partyIndex >= 0 ? 0.72 : 0.25));
        }
      }
      particles.update(dt);
      ambientDust(particles, time, rng);
      draw();
      frame = requestAnimationFrame(animate);
    };

    const resume = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      draw();
      if (!paused && !motion.matches && !document.hidden) frame = requestAnimationFrame(animate);
    };
    const resize = () => { prepareBackdrop(); resume(); };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    image.onload = () => { if (!disposed) resize(); };
    image.src = `${import.meta.env.BASE_URL}bg/${stage === 0 ? 'field' : 'battle_main'}.jpg`;
    motion.addEventListener('change', resume);
    document.addEventListener('visibilitychange', resume);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      image.onload = null;
      motion.removeEventListener('change', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [stage, paused]);

  return <canvas ref={ref} className="battle-scene" aria-hidden="true" />;
}
