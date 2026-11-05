import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Cpu, Database,
  Smartphone, CheckCircle2, Terminal, Layers,
  Wifi, QrCode, Lock, Building2,
  Receipt, Coins, TrendingUp, ChevronRight, Play, ArrowUpRight,
  Boxes
} from 'lucide-react';
import { SilkWavesCanvas } from '../components/landing/SilkWavesCanvas';
import { GlassCard } from '../components/landing/GlassCard';

export default function LandingPage() {
  // Interactive Simulator State: M-Pesa STK Push
  const [simPhone, setSimPhone] = useState('0740 841 168');
  const [simAmount, setSimAmount] = useState('500');
  const [simStatus, setSimStatus] = useState<'IDLE' | 'SENDING' | 'PUSHED' | 'CONFIRMED'>('IDLE');
  const [simStopwatch, setSimStopwatch] = useState(0);

  // Architecture Switcher Mode
  const [activeSegment, setActiveSegment] = useState<'SUPERMARKET' | 'HOSPITALITY' | 'WHOLESALE'>('SUPERMARKET');

  // Terminal telemetry counter
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2200);
    return () => clearInterval(interval);
  }, []);

  // Handle M-Pesa simulator trigger
  const runMpesaSimulation = () => {
    if (simStatus === 'SENDING' || simStatus === 'PUSHED') return;
    setSimStatus('SENDING');
    setSimStopwatch(0);

    const timer = setInterval(() => {
      setSimStopwatch(ms => ms + 10);
    }, 10);

    setTimeout(() => {
      setSimStatus('PUSHED');
    }, 420);

    setTimeout(() => {
      setSimStatus('CONFIRMED');
      clearInterval(timer);
    }, 1280);
  };

  const nodeTelemetry = useMemo(() => [
    { city: 'Nairobi Central', ping: 9 + (tick % 3), load: '24%', status: 'Nominal' },
    { city: 'Mombasa Port Hub', ping: 17 + (tick % 4), load: '38%', status: 'Nominal' },
    { city: 'Kisumu West', ping: 22 + (tick % 2), load: '19%', status: 'Nominal' },
    { city: 'Nakuru Rift Edge', ping: 14 + (tick % 3), load: '31%', status: 'Nominal' },
  ], [tick]);

  return (
    <div className="relative min-h-screen w-full bg-[#030712] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* 1. DYNAMIC AMBIENT SILK WAVES & OPTICAL CAUSTICS */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Living Silk Waves Canvas */}
        <SilkWavesCanvas className="opacity-90 mix-blend-screen" />

        {/* Deep ambient radial glow sources */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-radial from-cyan-600/15 via-indigo-600/5 to-transparent blur-3xl" />
        <div className="absolute top-[40%] -left-[10%] w-[800px] h-[600px] bg-radial from-emerald-500/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute top-[70%] -right-[10%] w-[900px] h-[700px] bg-radial from-purple-600/12 via-indigo-600/5 to-transparent blur-3xl" />

        {/* Micro-dot Matrix Texture */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Vignette edge compression */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,7,18,0.7)_100%)]" />
      </div>

      {/* ========================================================================= */}
      {/* 2. MASTER HERO SECTION (ASYMMETRICAL SPLIT) */}
      {/* ========================================================================= */}
      <section className="relative z-10 pt-28 pb-16 lg:pt-36 lg:pb-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column (Editorial Command Console) */}
          <div className="lg:col-span-7 space-y-7">
            
            {/* Live Orbital Mesh Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-500/30 bg-slate-900/60 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_0_20px_rgba(14,165,233,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
                WHIZ OS 7.4 · SUB-MS EDGE SYNC · DARAJA 2.0
              </span>
              <div className="h-3 w-px bg-white/20 hidden sm:block" />
              <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
                420ms Prompt Latency
              </span>
            </div>

            {/* Monumental Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.035em] leading-[1.04] text-white">
              The High-Performance{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-indigo-300 bg-clip-text text-transparent">
                Operating System
              </span>{' '}
              for African Commerce.
            </h1>

            {/* Architectural Value Statement */}
            <p className="text-base sm:text-lg text-slate-300/90 leading-relaxed font-normal max-w-2xl">
              Engineered from the silicon up for zero-latency retail terminals and unified cloud command. 
              Sub-millisecond offline-first execution, automated Safaricom M-Pesa STK callbacks with customer KYC memory, 
              and cryptographic KRA eTIMS signing — whether online or disconnected.
            </p>

            {/* Precision Action Bar */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/auth?signup=true"
                className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-[0_0_35px_rgba(14,165,233,0.4)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(14,165,233,0.65)] hover:scale-[1.02] active:scale-[0.99] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                <span>Deploy Free 14-Day Trial</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                to="/docs"
                className="inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-slate-200 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
              >
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Architecture Docs</span>
              </Link>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-cyan-300 transition-colors py-2 px-3"
              >
                <span>View Tiers</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Hardware Protocol Telemetry Bar */}
            <div className="pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Offline POS Latency</div>
                <div className="text-xl font-black text-white font-mono mt-0.5">&lt; 0.2ms</div>
                <div className="text-[11px] text-cyan-400/80 font-medium">LibSQL Edge Native</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">STK Dispatch</div>
                <div className="text-xl font-black text-white font-mono mt-0.5">420ms</div>
                <div className="text-[11px] text-emerald-400/80 font-medium">Daraja Async Socket</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Fiscal Protocol</div>
                <div className="text-xl font-black text-white font-mono mt-0.5">eTIMS VSCU</div>
                <div className="text-[11px] text-indigo-400/80 font-medium">KRA Compliant</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Hardware I/O</div>
                <div className="text-xl font-black text-white font-mono mt-0.5">ESC/POS 80mm</div>
                <div className="text-[11px] text-purple-400/80 font-medium">Raw USB & Bluetooth</div>
              </div>
            </div>

          </div>

          {/* Right Column: Live High-Tech Glass Cyber-Terminal */}
          <div className="lg:col-span-5 relative">
            
            {/* Ambient Backlight Sphere */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500/20 via-indigo-500/15 to-emerald-500/10 rounded-3xl blur-2xl opacity-75" />

            <GlassCard
              glowColor="rgba(14, 165, 233, 0.2)"
              enableTilt={true}
              badge="Edge Terminal 01"
              className="p-5 sm:p-6"
            >
              {/* Console Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="font-mono text-xs text-slate-400 tracking-wider">
                    live.whizpoint.app:3000
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  <Wifi className="w-3 h-3" />
                  <span>SYNCED</span>
                </div>
              </div>

              {/* M-Pesa STK Live Interactive Simulator Widget */}
              <div className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4 space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>M-Pesa STK Dispatch Telemetry</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    BuyGoods · Till 3098707
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Customer Phone</label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={e => setSimPhone(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Sale Amount (KES)</label>
                    <input
                      type="text"
                      value={simAmount}
                      onChange={e => setSimAmount(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-2.5 py-1.5 font-mono text-xs font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Simulation Trigger Button */}
                <button
                  onClick={runMpesaSimulation}
                  disabled={simStatus === 'SENDING' || simStatus === 'PUSHED'}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white py-2 text-xs font-bold shadow-md transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {simStatus === 'IDLE' && 'Fire Test STK Prompt'}
                    {simStatus === 'SENDING' && 'Fetching Token & Dispatching...'}
                    {simStatus === 'PUSHED' && 'Waiting for Customer PIN...'}
                    {simStatus === 'CONFIRMED' && 'Payment Verified (Reset)'}
                  </span>
                </button>

                {/* Telemetry Log Stream */}
                <div className="rounded-lg bg-black/60 p-2.5 font-mono text-[11px] space-y-1 border border-white/5">
                  <div className="text-slate-500 flex justify-between">
                    <span>[00:00.000] POS Request Received</span>
                    <span className="text-cyan-400 font-bold">{simStopwatch}ms</span>
                  </div>
                  
                  {simStatus !== 'IDLE' && (
                    <div className="text-cyan-300">
                      [+00:00.042] Daraja Auth Token cached in RAM
                    </div>
                  )}

                  {(simStatus === 'PUSHED' || simStatus === 'CONFIRMED') && (
                    <div className="text-amber-300">
                      [+00:00.418] STK push shown on customer phone
                    </div>
                  )}

                  {simStatus === 'CONFIRMED' && (
                    <div className="space-y-1 pt-1 border-t border-emerald-900/50">
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>TXN: UK5KZ13A22 · KES {simAmount}.00</span>
                      </div>
                      <div className="text-slate-300 text-[10px]">
                        Customer KYC: <span className="text-white font-bold">Josphat Mburu</span> (Auto-Resolved)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Edge Node Status Grid */}
              <div className="border-t border-white/[0.08] pt-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span>ACTIVE REPLICATION NODES</span>
                  <span className="text-emerald-400">4 / 4 ONLINE</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {nodeTelemetry.map(n => (
                    <div key={n.city} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-slate-200">{n.city}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Load {n.load}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-cyan-400 font-bold">{n.ping}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </GlassCard>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ARCHITECTURAL BENTO GRID (ASYMMETRICAL 12-COLUMN MESH) */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-16 lg:py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        
        {/* Section Editorial Header */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300 mb-4 backdrop-blur-md">
            <Layers className="w-3 h-3" />
            <span>Infrastructure Matrix</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.03em] text-white">
            Architected for zero friction.{' '}
            <span className="text-slate-400 font-normal">
              Built for enterprise scale.
            </span>
          </h2>
          <p className="text-slate-300 text-base mt-3 leading-relaxed">
            Eliminate traditional SaaS latency. Whiz POS pairs local high-speed embedded execution 
            with multi-tenant cloud orchestration for unprecedented resilience.
          </p>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* BENTO 1 (Span 7, Tall): Zero-Latency Hybrid Edge Core */}
          <GlassCard
            glowColor="rgba(14, 165, 233, 0.2)"
            badge="Local Edge Engine"
            className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
                Offline-First Embedded Architecture
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Your cashiers cannot wait for internet round-trips. Whiz POS runs an embedded transactional database directly 
                on each terminal. Scan items at 60 scans per minute with zero spinner delay. When connection restores, 
                changes sync automatically via our end-to-end encrypted Cloudflare tunnel pipeline.
              </p>

              {/* Data Flow Diagram Visualization */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 font-mono text-xs">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-3">Sync State Machine</div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  
                  <div className="flex-1 p-3 rounded-xl bg-white/[0.04] border border-white/5 w-full">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold mb-1">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>POS Terminal</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Local LibSQL & SQLite</div>
                    <div className="text-[10px] text-emerald-400 mt-1">● 0.18ms Commit</div>
                  </div>

                  <div className="text-slate-500 font-mono text-xs">
                    <span className="hidden sm:inline">────►</span>
                    <span className="sm:hidden">▼</span>
                  </div>

                  <div className="flex-1 p-3 rounded-xl bg-white/[0.04] border border-white/5 w-full">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cloudflare Tunnel</span>
                    </div>
                    <div className="text-[11px] text-slate-400">api.whizpoint.app</div>
                    <div className="text-[10px] text-cyan-400 mt-1">● Strict TLS 1.3</div>
                  </div>

                  <div className="text-slate-500 font-mono text-xs">
                    <span className="hidden sm:inline">────►</span>
                    <span className="sm:hidden">▼</span>
                  </div>

                  <div className="flex-1 p-3 rounded-xl bg-white/[0.04] border border-white/5 w-full">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                      <Database className="w-3.5 h-3.5" />
                      <span>Cloud Back Office</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Multi-Store Hub</div>
                    <div className="text-[10px] text-purple-400 mt-1">● Global Reporting</div>
                  </div>

                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span>Automatic conflict resolution</span>
              <span className="font-mono text-cyan-400 font-bold">Zero Data Loss Guarantee</span>
            </div>
          </GlassCard>

          {/* BENTO 2 (Span 5): Daraja Instant KYC & Name Formatting */}
          <GlassCard
            glowColor="rgba(16, 185, 129, 0.2)"
            badge="Daraja KYC"
            className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
                Automated Customer KYC & Phone Memory
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                Never ask customers for their names twice. Our proprietary KYC directory resolves raw Daraja callbacks 
                and formats titles into clean First + Last (<span className="text-white font-mono font-bold">Josphat Mburu</span>) 
                saving cashier keystrokes and printing crisp receipts.
              </p>

              <div className="space-y-2 rounded-xl bg-slate-900/70 p-3.5 border border-white/10 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/5 text-[10px]">
                  <span>RAW SAFARICOM STRING</span>
                  <span className="text-rose-400">NOISY ALL-CAPS</span>
                </div>
                <div className="text-slate-300 line-through opacity-60">JOSPHAT NJUGUNA MBURU</div>
                <div className="flex items-center justify-between text-slate-400 pt-2 pb-1 border-b border-white/5 text-[10px]">
                  <span>WHIZ REFINED KYC</span>
                  <span className="text-emerald-400 font-bold">CLEAN FIRST + LAST</span>
                </div>
                <div className="text-emerald-300 font-bold flex items-center justify-between">
                  <span>Josphat Mburu</span>
                  <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/30">Auto Saved</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span>Till, Paybill & STK Push</span>
              <span className="font-mono text-emerald-400 font-bold">100% C2B Verified</span>
            </div>
          </GlassCard>

          {/* BENTO 3 (Span 5): KRA eTIMS VSCU Cryptographic Signer */}
          <GlassCard
            glowColor="rgba(168, 85, 247, 0.2)"
            badge="eTIMS Ready"
            className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
                Cryptographic eTIMS Tax Compliance
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                Seamless VSCU integration generates verified KRA QR codes and cryptographic hashes on thermal slips 
                with full audit categorization (16% VAT, Zero-Rated, Exempt).
              </p>

              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 font-mono text-xs flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded grid grid-cols-3 gap-0.5 p-1">
                    <span className="bg-white rounded-[1px]" />
                    <span className="bg-white rounded-[1px]" />
                    <span className="bg-transparent" />
                    <span className="bg-white rounded-[1px]" />
                    <span className="bg-white rounded-[1px]" />
                    <span className="bg-white rounded-[1px]" />
                  </div>
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase">INVOICE NUMBER</div>
                  <div className="text-white font-bold truncate">ETIMS-KE-2026-09812</div>
                  <div className="text-[10px] text-emerald-400 font-bold">SHA-256 Validated Signature</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span>Automatic KRA Transmission</span>
              <span className="font-mono text-purple-400 font-bold">VSCU Protocol</span>
            </div>
          </GlassCard>

          {/* BENTO 4 (Span 7): Real-time Inventory Valuation & Cash Float Reconciliation */}
          <GlassCard
            glowColor="rgba(245, 158, 11, 0.2)"
            badge="Audit Intelligence"
            className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
                Executive BI, Stock Valuation & Cash Reconciliation
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Know your exact business worth in real time. Track Stock Valuation (At Cost vs Retail), 
                unlock dormant capital with the Dead Stock (&gt;30 days) detector, and enforce cashier drawer audits 
                with our X/Z Read reconciliation formula.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Pareto 80/20</div>
                  <div className="text-lg font-black text-emerald-400 mt-1">Top 20 Star</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Focus high-margin items</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Dead Stock Radar</div>
                  <div className="text-lg font-black text-amber-400 mt-1">Tied Capital</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Identifies 30+ days zero sales</div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Cash Drawer Audit</div>
                  <div className="text-lg font-black text-cyan-400 mt-1">Zero Shortage</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">X & Z Read reconciliation</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span>Executive Daily PDF Generator</span>
              <span className="font-mono text-amber-400 font-bold">1-Click Boardroom Export</span>
            </div>
          </GlassCard>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE SEGMENT ARCHITECTURE SWITCHER */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-16 lg:py-24 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 sm:p-10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-8 border-b border-white/10">
            <div>
              <div className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">
                WORKFLOW PROFILES
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Tailored for your specific retail model.
              </h2>
            </div>

            {/* Segment Toggle Buttons */}
            <div className="flex rounded-2xl border border-white/10 bg-slate-900/90 p-1.5 gap-1.5 self-start">
              <button
                onClick={() => setActiveSegment('SUPERMARKET')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSegment === 'SUPERMARKET'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Supermarket & Retail</span>
              </button>

              <button
                onClick={() => setActiveSegment('HOSPITALITY')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSegment === 'HOSPITALITY'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Bars & Hospitality</span>
              </button>

              <button
                onClick={() => setActiveSegment('WHOLESALE')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSegment === 'WHOLESALE'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Multi-Warehouse Hub</span>
              </button>
            </div>
          </div>

          {/* Dynamic Segment Telemetry View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {activeSegment === 'SUPERMARKET' && (
              <>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Sequential Barcode Scanning</div>
                  <div className="text-lg font-bold text-white">High-Speed POS Checkout</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Designed for 100+ items per basket. Supports scale barcodes with embedded weight, automatic SKU sequence generation, and instantaneous change calculation.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Dual Outlet Control</div>
                  <div className="text-lg font-bold text-white">Central Store vs Direct Selling</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Prevent inventory double-counting. Single shops operate direct selling without GRN friction; large stores transfer stock from central store to checkout shelves.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Cashier Accountability</div>
                  <div className="text-lg font-bold text-white">Individual Shift Slips</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Generate closing Z-slips per cashier till. Compares physical float cash against system totals for total transparency at shift handoff.
                  </p>
                </div>
              </>
            )}

            {activeSegment === 'HOSPITALITY' && (
              <>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-purple-400 font-bold uppercase">Table & Room Management</div>
                  <div className="text-lg font-bold text-white">Running Customer Tabs</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Keep tabs open across waitstaff shifts. Real-time unpaid hospitality tab summaries allow managers to audit floor balances with zero lost revenue.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-purple-400 font-bold uppercase">Kitchen Order Tickets (KOT)</div>
                  <div className="text-lg font-bold text-white">Multi-Station Thermal Printing</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Automatically route drinks to the Bar printer and food orders to the Kitchen line without cashier intervention.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-purple-400 font-bold uppercase">Instant Bill Splitting</div>
                  <div className="text-lg font-bold text-white">Split Payments by Seat</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Accept part cash, part M-Pesa STK push, and part credit card on the same ticket with instant receipt emission.
                  </p>
                </div>
              </>
            )}

            {activeSegment === 'WHOLESALE' && (
              <>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-emerald-400 font-bold uppercase">Inter-Branch Stock Movement</div>
                  <div className="text-lg font-bold text-white">Transit Manifests & Approval</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Issue dispatch notes from main warehouse in Nairobi to satellite outlets in Mombasa and Kisumu with destination confirmation and variance tracking.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-emerald-400 font-bold uppercase">Credit Terms & Ledgers</div>
                  <div className="text-lg font-bold text-white">Debtor Aging & Statements</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Issue 30-day corporate trade credit. Track aging balances (0-30, 31-60, 90+ days) with automated WhatsApp statement dispatch.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="text-xs font-mono text-emerald-400 font-bold uppercase">Purchase Orders & GRN</div>
                  <div className="text-lg font-bold text-white">Supplier Price History</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Receive deliveries against PO numbers. Automatically updates weighted average cost and calculates landed unit cost before shelf deployment.
                  </p>
                </div>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. METRIC PROOF & ENTERPRISE VELOCITY */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <GlassCard glowColor="rgba(14, 165, 233, 0.15)" className="p-6 text-center">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">KSh 4.8B+</div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mt-2">Annual GMV Handled</div>
            <div className="text-[11px] text-slate-400 mt-1">Processed across 500+ active tills</div>
          </GlassCard>

          <GlassCard glowColor="rgba(16, 185, 129, 0.15)" className="p-6 text-center">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">&lt; 0.4s</div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mt-2">STK Push Latency</div>
            <div className="text-[11px] text-slate-400 mt-1">Direct Safaricom Daraja fiber link</div>
          </GlassCard>

          <GlassCard glowColor="rgba(168, 85, 247, 0.15)" className="p-6 text-center">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">99.995%</div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mt-2">Register Uptime</div>
            <div className="text-[11px] text-slate-400 mt-1">Full offline functionality during cuts</div>
          </GlassCard>

          <GlassCard glowColor="rgba(245, 158, 11, 0.15)" className="p-6 text-center">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">100%</div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mt-2">KRA eTIMS Valid</div>
            <div className="text-[11px] text-slate-400 mt-1">Cryptographic tax signature on all bills</div>
          </GlassCard>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. HIGH-TECH MONOLITH CTA FINIAL */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-black p-8 sm:p-14 lg:p-16 overflow-hidden backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
          
          {/* Luminous Horizon Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-24 bg-cyan-500/15 blur-3xl" />
          
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Cloud Activation</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-[-0.03em] leading-tight">
              Ready to upgrade your store to the next generation of retail intelligence?
            </h2>

            <p className="text-slate-300 text-base sm:text-lg mt-4 leading-relaxed">
              Launch your account in 90 seconds. Full access to M-Pesa STK push, multi-outlet branch synchronization, 
              KRA eTIMS compliance, and offline terminal registers.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-8">
              <Link
                to="/auth?signup=true"
                className="group relative inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-950 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.99]"
              >
                <span>Start Free 14-Day Trial</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-6 py-4 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.1] hover:border-white/25"
              >
                <span>Compare Plans & Features</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/10 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant STK Push Access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>24/7 Priority Support</span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
