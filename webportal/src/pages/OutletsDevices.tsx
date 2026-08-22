import { Building2, Monitor } from 'lucide-react';
import OutletsManager from '../components/Settings/OutletsManager';
import TerminalManager from '../components/Settings/TerminalManager';

export default function OutletsDevices() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] mb-1">
            Network Management
          </div>
          <h1 className="font-heading text-2xl sm:text-[1.7rem] font-black tracking-tight text-[color:var(--text-primary)] truncate flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[color:var(--accent-primary)]" />
            Outlets & Devices
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">
            Manage your physical locations and approve local POS terminals connecting to the cloud.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Active Outlets Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[color:var(--text-primary)]" />
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Active Outlets</h2>
          </div>
          <div className="glass-panel p-4 rounded-2xl">
            <OutletsManager />
          </div>
        </section>

        {/* Device Approvals Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5 text-[color:var(--text-primary)]" />
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Pending Device Approvals</h2>
              <p className="text-xs text-[color:var(--text-muted)]">Local POS terminals broadcasting connection requests.</p>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl">
            <TerminalManager />
          </div>
        </section>
      </div>
    </div>
  );
}
