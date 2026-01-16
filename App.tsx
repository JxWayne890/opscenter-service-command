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

// Demo organization - matches complete_setup.sql
const DEMO_ORG = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: "A Dog's World",
  slug: 'adogs-world',
  industry: 'pet_care',
  settings: { timezone: 'America/Chicago' }
};

const DashboardContent: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('pulse');
  const { currentUser, isAuthenticated, isLoading } = useOpsCenter();

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => { }} />;
  }

  return (
    <div className="min-h-screen flex p-4 lg:p-6 gap-6 bg-slate-50">
      <InviteStaffModal />
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col space-y-6">
        <Header user={currentUser} org={DEMO_ORG} />
        {isLoading && (
          <div className="text-center py-4 text-indigo-600 font-medium">Loading data from Supabase...</div>
        )}
        <main className="max-w-[1600px] w-full mx-auto pb-24 lg:pb-0">
          {activeView === 'pulse' && <PulseView setActiveView={setActiveView} />}
          {activeView === 'schedule' && <ScheduleView />}
          {activeView === 'timeclock' && <TimeClockView />}
          {activeView === 'roster' && <RosterView />}
          {activeView === 'knowledge' && <KnowledgeHub />}
          {activeView === 'comms' && <CommsHub />}
          {activeView === 'settings' && <SettingsView />}
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
