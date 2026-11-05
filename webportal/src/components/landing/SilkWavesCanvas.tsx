import React, { useEffect, useRef } from 'react';

interface WaveConfig {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  colorStart: string;
  colorEnd: string;
  strokeColor: string;
  strokeWidth: number;
  phaseOffset: number;
}

export const SilkWavesCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let time = 0;
    let mouseX = width * 0.5;
    let mouseY = height * 0.4;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    handleResize();

    // Harmonic wave ribbons creating fluid layered silk
    const waves: WaveConfig[] = [
      {
        baseY: 0.25,
        amplitude: 75,
        frequency: 0.0018,
        speed: 0.006,
        colorStart: 'rgba(14, 165, 233, 0.16)', // Cyan
        colorEnd: 'rgba(99, 102, 241, 0.02)',
        strokeColor: 'rgba(56, 189, 248, 0.45)',
        strokeWidth: 1.4,
        phaseOffset: 0,
      },
      {
        baseY: 0.38,
        amplitude: 95,
        frequency: 0.0014,
        speed: -0.005,
        colorStart: 'rgba(99, 102, 241, 0.14)', // Indigo
        colorEnd: 'rgba(168, 85, 247, 0.01)',
        strokeColor: 'rgba(129, 140, 248, 0.4)',
        strokeWidth: 1.2,
        phaseOffset: Math.PI * 0.4,
      },
      {
        baseY: 0.52,
        amplitude: 110,
        frequency: 0.0012,
        speed: 0.004,
        colorStart: 'rgba(16, 185, 129, 0.12)', // Emerald / Teal
        colorEnd: 'rgba(14, 165, 233, 0.02)',
        strokeColor: 'rgba(52, 211, 153, 0.35)',
        strokeWidth: 1.2,
        phaseOffset: Math.PI * 0.8,
      },
      {
        baseY: 0.68,
        amplitude: 85,
        frequency: 0.0016,
        speed: -0.007,
        colorStart: 'rgba(14, 165, 233, 0.12)', // Deep Blue
        colorEnd: 'rgba(30, 41, 59, 0.0)',
        strokeColor: 'rgba(34, 211, 238, 0.3)',
        strokeWidth: 1.0,
        phaseOffset: Math.PI * 1.3,
      },
      {
        baseY: 0.82,
        amplitude: 65,
        frequency: 0.002,
        speed: 0.008,
        colorStart: 'rgba(168, 85, 247, 0.10)', // Violet
        colorEnd: 'rgba(15, 23, 42, 0.0)',
        strokeColor: 'rgba(192, 132, 252, 0.3)',
        strokeWidth: 0.8,
        phaseOffset: Math.PI * 1.7,
      },
    ];

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 1;
      // Smooth mouse easing
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      const mouseInfluenceX = (mouseX / width - 0.5) * 80;
      const mouseInfluenceY = (mouseY / height - 0.5) * 40;

      // Draw each silk wave layer
      for (let i = 0; i < waves.length; i++) {
        const w = waves[i];
        const currentBaseY = height * w.baseY + mouseInfluenceY * (i * 0.2 + 0.3);
        const step = 24; // Precision sampling step

        ctx.beginPath();
        ctx.moveTo(0, height);

        let prevX = 0;
        let prevY = currentBaseY;

        for (let x = 0; x <= width + step; x += step) {
          // Double harmonic sine modulation for silk ribbon fold texture
          const wave1 = Math.sin(x * w.frequency + time * w.speed + w.phaseOffset + mouseInfluenceX * 0.01);
          const wave2 = Math.cos(x * (w.frequency * 1.8) - time * (w.speed * 0.6) + w.phaseOffset * 0.5);
          const wave3 = Math.sin((x + time * 12) * 0.0006) * 0.4;
          
          const y = currentBaseY + (wave1 * 0.65 + wave2 * 0.35 + wave3) * w.amplitude;

          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            // Cubic smoothing between points
            const xc = (prevX + x) / 2;
            const yc = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, xc, yc);
          }

          prevX = x;
          prevY = y;
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Wave volumetric silk gradient
        const grad = ctx.createLinearGradient(0, currentBaseY - w.amplitude, 0, height);
        grad.addColorStop(0, w.colorStart);
        grad.addColorStop(0.6, w.colorEnd);
        grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Luminous crest stroke
        ctx.beginPath();
        ctx.moveTo(0, currentBaseY);
        prevX = 0;
        prevY = currentBaseY;

        for (let x = 0; x <= width + step; x += step) {
          const wave1 = Math.sin(x * w.frequency + time * w.speed + w.phaseOffset + mouseInfluenceX * 0.01);
          const wave2 = Math.cos(x * (w.frequency * 1.8) - time * (w.speed * 0.6) + w.phaseOffset * 0.5);
          const wave3 = Math.sin((x + time * 12) * 0.0006) * 0.4;
          const y = currentBaseY + (wave1 * 0.65 + wave2 * 0.35 + wave3) * w.amplitude;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            const xc = (prevX + x) / 2;
            const yc = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, xc, yc);
          }
          prevX = x;
          prevY = y;
        }

        ctx.strokeStyle = w.strokeColor;
        ctx.lineWidth = w.strokeWidth;
        ctx.shadowColor = w.strokeColor;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset blur for next draw
      }

      ctx.globalCompositeOperation = 'source-over';
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      style={{ willChange: 'transform' }}
    />
  );
};
