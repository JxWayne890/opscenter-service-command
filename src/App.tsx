import React, { useState } from 'react';
import { ViewType } from './types';
import Sidebar, { MobileNav } from './components/Sidebar';
import Header from './components/Header';
import PulseView from './components/views/PulseView';
import KnowledgeHub from './components/views/KnowledgeHub';
import CommsHub from './components/views/CommsHub';
import RosterView from './components/views/RosterView';
import InviteStaffModal from './components/InviteStaffModal';
import ScheduleView from './components/views/ScheduleView';
import TimeClockView from './components/views/TimeClockView';
import SettingsView from './components/views/SettingsView';
import LoginScreen from './components/LoginScreen';
import { OpsCenterProvider, useOpsCenter } from './services/store';

const DashboardContent: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('pulse');
  const { currentUser, isAuthenticated, isLoading, authLoading, organization, hasMissingProfile, logout } = useOpsCenter();

  // Show login screen if not authenticated
  if (!authLoading && !isAuthenticated && !hasMissingProfile) {
    return <LoginScreen onLogin={() => { }} />;
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading OpsCenter...</p>
        </div>
      </div>
    );
  }

  // Show message if user is signed in but has no profile
  if (hasMissingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="glass-panel w-full max-w-md p-8 text-center bg-white/50">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-amber-500/20">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Not Found</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            You're signed in, but there's no profile linked to your account.
            Please ask your administrator to create your profile, or join using an invite code.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => logout()}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20"
            >
              Sign Out & Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use org from store or fallback
  const displayOrg = organization || {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: "A Dog's World",
    slug: 'adogs-world',
    industry: 'pet_care',
    settings: { timezone: 'America/Chicago' }
  };

  return (
    <div className="min-h-screen flex lg:p-4 gap-6 bg-slate-50/50">
      <InviteStaffModal />
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header user={currentUser} org={displayOrg} />

        {isLoading && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg z-50 animate-pulse">
            Syncing data...
          </div>
        )}

        <main className="flex-1 relative pb-32 lg:pb-8 px-4 lg:px-6">
          <div className="max-w-[1600px] w-full mx-auto animate-slide-up">
            {activeView === 'pulse' && <PulseView setActiveView={setActiveView} />}
            {activeView === 'schedule' && <ScheduleView />}
            {activeView === 'timeclock' && <TimeClockView />}
            {activeView === 'roster' && <RosterView />}
            {activeView === 'knowledge' && <KnowledgeHub />}
            {activeView === 'comms' && <CommsHub />}
            {activeView === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      <MobileNav activeView={activeView} setActiveView={setActiveView} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <OpsCenterProvider>
      <DashboardContent />
    </OpsCenterProvider>
  );
};

export default App;
