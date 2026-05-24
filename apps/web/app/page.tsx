"use client";

import {
  ArrowLeft,
  Bell,
  BookMarked,
  ChartPie,
  ChevronDown,
  ClipboardList,
  Grid2X2,
  LayoutGrid,
  Menu,
  Plus,
  Settings,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { SchoolAvatar } from '../src/components/avatar/school-avatar';
import { AssignmentWorkspace } from '../src/components/assignment/assignment-workspace';
import { ToastContainer } from '../src/components/toast-container';
import { useAssignmentStore } from '../src/store/assignment-store';
import { useEffect } from 'react';
import { createWorkflowSocket } from '../src/lib/websocket';
import { fetchAssignments } from '../src/lib/api';

const sidebarItems = [
  { icon: Grid2X2, label: 'Home' },
  { icon: UsersRound, label: 'My Groups' },
  { icon: ClipboardList, label: 'Assignments', assignmentList: true },
  { icon: BookMarked, label: "AI Teacher's Toolkit" },
  { icon: ChartPie, label: 'My Library' },
];

const bottomNavItems = [
  { icon: Grid2X2, label: 'Home' },
  { icon: ClipboardList, label: 'Assignments', assignmentList: true },
  { icon: BookMarked, label: 'Library' },
  { icon: Sparkles, label: 'AI Toolkit' },
];

export default function HomePage() {
  const openBuilder = useAssignmentStore((state) => state.openBuilder);
  const openEmpty = useAssignmentStore((state) => state.openEmpty);
  const step = useAssignmentStore((state) => state.step);
  const assignmentCount = useAssignmentStore((state) => state.assignmentCount);
  const setAssignmentCount = useAssignmentStore((state) => state.setAssignmentCount);
  const assignmentListOpen = step === 'empty';

  useEffect(() => {
    const socket = createWorkflowSocket((event) => {
      // React to queue/processing/completion/failure events by refreshing assignments
      if (event.type === 'assignment:queued' || event.type === 'assignment:completed' || event.type === 'assignment:failed') {
        // Update assignment count in the sidebar (use total assignments)
        void (async () => {
          try {
            const records = await fetchAssignments();
            setAssignmentCount(records.filter((a) => a.status === 'completed').length);
          } catch (e) {
            // ignore
          }
        })();

        // Notify other components (like AssignmentWorkspace) to refresh their list
        try {
          window.dispatchEvent(new CustomEvent('assignment:updated', { detail: { type: event.type, data: event.data } }));
        } catch {
          // ignore (SSR or non-browser)
        }
      }
    });

    return () => socket.close();
  }, [setAssignmentCount]);

  return (
    <main className="page-shell">
      <aside className="sidebar desktop-only">
        <div className="brand-row">
          <img className="brand-image brand-image-desktop" src="/brand-desktop.png" alt="VedaAI" />
          <div className="brand-wordmark">VedaAI</div>
        </div>

        <button className="primary-action" style={{ marginBottom: 26 }} aria-label="Create assignment" onClick={openBuilder}>
          <Sparkles size={16} />
          <span>Create Assignment</span>
        </button>

        <nav className="nav-list" aria-label="Primary">
          {sidebarItems.map(({ icon: Icon, label, assignmentList }) => (
            <button
              className={`nav-item ${assignmentList && assignmentListOpen ? 'nav-item-active' : ''}`}
              key={label}
              type="button"
              onClick={assignmentList ? openEmpty : undefined}
            >
              <span className="nav-icon">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="nav-label">{label}</span>
              {assignmentList && assignmentCount > 0 ? <span className="nav-badge">{assignmentCount}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item settings-item" type="button">
            <span className="nav-icon">
              <Settings size={16} strokeWidth={2} />
            </span>
            <span className="nav-label">Settings</span>
          </button>

          <div className="school-card">
            <div className="school-avatar">
              <SchoolAvatar label="Delhi Public School avatar" size={96} />
            </div>
            <div>
              <div className="school-name">Delhi Public School</div>
              <div className="school-city">Bokaro Steel City</div>
            </div>
          </div>
        </div>
      </aside>

      <section className="content-shell desktop-content">
        <header className="topbar desktop-topbar">
          <button className="topbar-left topbar-back-button" type="button" onClick={openEmpty} aria-label="Back to assignments">
            <ArrowLeft size={22} strokeWidth={2} />
            <div className="topbar-crumb">
              <span className="crumb-icon">
                <LayoutGrid size={15} strokeWidth={2} />
              </span>
              <span>Assignment</span>
            </div>
          </button>

          <div className="topbar-right">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={20} strokeWidth={2} />
              <span className="notification-dot" />
            </button>
            <button className="profile-pill" aria-label="User menu">
              <span className="profile-avatar">
                <SchoolAvatar label="Delhi Public School avatar" size={40} />
              </span>
              <span className="profile-name">School Admin</span>
              <ChevronDown className="profile-caret" size={22} strokeWidth={2} />
            </button>
          </div>
        </header>

        <AssignmentWorkspace variant="desktop" />
      </section>

      <section className="content-shell mobile-content">
        <header className="mobile-topbar">
          <div className="mobile-brand-row">
            <img className="brand-image brand-image-mobile" src="/brand-mobile.png" alt="VedaAI" />
            <div className="brand-wordmark mobile-brand-wordmark">VedaAI</div>
          </div>
          <div className="mobile-topbar-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} strokeWidth={2} />
              <span className="notification-dot" />
            </button>
            <div className="profile-avatar profile-avatar-small">
              <SchoolAvatar label="Delhi Public School avatar" size={32} />
            </div>
            <button className="icon-button" aria-label="Open menu">
              <Menu size={20} strokeWidth={2} />
            </button>
          </div>
        </header>

        <AssignmentWorkspace variant="mobile" />

        {step === 'empty' ? (
          <button className="floating-create-button mobile-fab" aria-label="Create assignment" onClick={openBuilder}>
            <Plus size={20} strokeWidth={1.6} />
          </button>
        ) : null}

        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {bottomNavItems.map(({ icon: Icon, label, assignmentList }) => (
            <button
              className={`bottom-nav-item ${assignmentList && assignmentListOpen ? 'bottom-nav-item-active' : ''}`}
              key={label}
              type="button"
              onClick={assignmentList ? openEmpty : undefined}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
      <ToastContainer />
    </main>
  );
}

