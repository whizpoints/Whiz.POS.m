import React from 'react';
import Navigation from './Navigation';
import Header from './Header';
import { usePosStore } from '../store/posStore';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const isSidebarCollapsed = usePosStore(state => state.isSidebarCollapsed);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {!isSidebarCollapsed && <Navigation />}
      <div className="flex-1 flex flex-col h-full">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
