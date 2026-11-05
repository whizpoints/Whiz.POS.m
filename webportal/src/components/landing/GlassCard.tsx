import React, { useRef, useState, type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  enableTilt?: boolean;
  onClick?: () => void;
  badge?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(14, 165, 233, 0.15)',
  enableTilt = true,
  onClick,
  badge,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    setCoords({ x: xPercent, y: yPercent });

    if (enableTilt) {
      // Gentle 3D tilt max 4 degrees
      const rx = ((y / rect.height) - 0.5) * -6;
      const ry = ((x / rect.width) - 0.5) * 6;
      setTilt({ rx, ry });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-2xl md:rounded-3xl border border-white/[0.08] bg-slate-950/40 backdrop-blur-2xl transition-all duration-300 ease-out hover:border-white/[0.22] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7),0_0_24px_-4px_var(--card-glow,rgba(14,165,233,0.18))] overflow-hidden ${className}`}
      style={{
        transform: enableTilt && isHovered
          ? `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(6px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
        boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.12), 0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        willChange: 'transform',
      }}
    >
      {/* Dynamic Cursor Light Cone */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 320px at ${coords.x}% ${coords.y}%, ${glowColor}, transparent 70%)`,
        }}
      />

      {/* Top Hairline Specular Sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {badge}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};
