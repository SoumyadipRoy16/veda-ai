import {
  ArrowLeft,
  Bell,
  BookOpen,
  FileText,
  Grid2X2,
  LayoutGrid,
  LibraryBig,
  Menu,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react';

import { SchoolAvatar } from '../src/components/avatar/school-avatar';

const desktopAssignments = [
  { title: 'Quiz on Electricity', assignedOn: '20-06-2025', due: '21-06-2025' },
  { title: 'Quiz on Electricity', assignedOn: '20-06-2025', due: '21-06-2025' },
  { title: 'Quiz on Electricity', assignedOn: '20-06-2025', due: '21-06-2025' },
  { title: 'Quiz on Electricity', assignedOn: '20-06-2025', due: '21-06-2025' },
  { title: 'Quiz on Electricity', assignedOn: '20-06-2025', due: '21-06-2025' },
  { title: 'Quiz on Electricity', assignedOn: '20-06-2025', due: '21-06-2025' },
];

const mobileAssignments = Array.from({ length: 5 }, () => ({
  title: 'Quiz on Electricity',
  assignedOn: '20-06-2025',
  due: '21-06-2025',
}));

const sidebarItems = [
  { icon: Grid2X2, label: 'Home' },
  { icon: LayoutGrid, label: 'My Groups' },
  { icon: FileText, label: 'Assignments', active: true, badge: '10' },
  { icon: Sparkles, label: "AI Teacher's Toolkit" },
  { icon: LibraryBig, label: 'My Library' },
];

const bottomNavItems = [
  { icon: Grid2X2, label: 'Home' },
  { icon: FileText, label: 'Assignments', active: true },
  { icon: BookOpen, label: 'Library' },
  { icon: Sparkles, label: 'AI Toolkit' },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <aside className="sidebar desktop-only">
        <div className="brand-row">
          <div className="brand-mark">
            <span>V</span>
          </div>
          <div className="brand-wordmark">VedaAI</div>
        </div>

        <button className="primary-action">
          <Sparkles size={16} />
          <span>Create Assignment</span>
        </button>

        <nav className="nav-list" aria-label="Primary">
          {sidebarItems.map(({ icon: Icon, label, active, badge }) => (
            <div className={`nav-item ${active ? 'nav-item-active' : ''}`} key={label}>
              <span className="nav-icon">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="nav-label">{label}</span>
              {badge ? <span className="nav-badge">{badge}</span> : null}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item settings-item">
            <span className="nav-icon">
              <Settings size={16} strokeWidth={2} />
            </span>
            <span className="nav-label">Settings</span>
          </div>

          <div className="school-card">
            <div className="school-avatar">
              <SchoolAvatar label="Delhi Public School avatar" />
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
          <div className="topbar-left">
            <ArrowLeft size={22} strokeWidth={2} />
            <div className="topbar-crumb">
              <span className="crumb-icon">
                <LayoutGrid size={15} strokeWidth={2} />
              </span>
              <span>Assignment</span>
            </div>
          </div>

          <div className="topbar-right">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={20} strokeWidth={2} />
              <span className="notification-dot" />
            </button>
            <button className="profile-pill" aria-label="User menu">
              <span className="profile-avatar">👩‍🏫</span>
              <span>John Doe</span>
              <span className="profile-caret">⌄</span>
            </button>
          </div>
        </header>

        <section className="page-section-header">
          <div className="section-title-row">
            <span className="status-dot" />
            <div>
              <h1>Assignments</h1>
              <p>Manage and create assignments for your classes.</p>
            </div>
          </div>

          <div className="section-tools">
            <button className="filter-pill">
              <span className="filter-icon">⛃</span>
              <span>Filter By</span>
            </button>
            <label className="search-pill" aria-label="Search Assignment">
              <span>⌕</span>
              <input type="text" placeholder="Search Assignment" readOnly />
            </label>
          </div>
        </section>

        <section className="desktop-grid" aria-label="Assignment cards">
          {desktopAssignments.map((card, index) => (
            <article className="assignment-card" key={`${card.title}-${index}`}>
              <button className="card-menu" aria-label="Open assignment menu">
                ⋮
              </button>
              <h2>{card.title}</h2>
              <div className="card-meta-row">
                <p>
                  <strong>Assigned on :</strong> {card.assignedOn}
                </p>
                <p>
                  <strong>Due :</strong> {card.due}
                </p>
              </div>
            </article>
          ))}
        </section>

        <button className="floating-create-button desktop-only" aria-label="Create assignment">
          <Plus size={18} strokeWidth={2.5} />
          <span>Create Assignment</span>
        </button>
      </section>

      <section className="content-shell mobile-content">
        <header className="mobile-topbar">
          <div className="mobile-brand-row">
            <div className="brand-mark mobile-brand-mark">V</div>
            <div className="brand-wordmark">VedaAI</div>
          </div>
          <div className="mobile-topbar-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} strokeWidth={2} />
              <span className="notification-dot" />
            </button>
            <div className="profile-avatar profile-avatar-small">👩‍🏫</div>
            <button className="icon-button" aria-label="Open menu">
              <Menu size={20} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="mobile-subheader">
          <button className="back-pill" aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span>Assignments</span>
        </div>

        <div className="mobile-tools">
          <button className="filter-pill mobile-filter">
            <span>⛃</span>
            <span>Filter</span>
          </button>
          <label className="search-pill mobile-search" aria-label="Search Name">
            <span>⌕</span>
            <input type="text" placeholder="Search Name" readOnly />
          </label>
        </div>

        <section className="mobile-list" aria-label="Mobile assignment cards">
          {mobileAssignments.map((card, index) => (
            <article className="mobile-card" key={`${card.title}-${index}`}>
              <button className="card-menu" aria-label="Open assignment menu">
                ⋮
              </button>
              <h2>{card.title}</h2>
              <div className="mobile-card-meta">
                <p>
                  <strong>Assigned on :</strong> {card.assignedOn}
                </p>
                <p>
                  <strong>Due :</strong> {card.due}
                </p>
              </div>
            </article>
          ))}
        </section>

        <button className="floating-create-button mobile-fab" aria-label="Create assignment">
          <Plus size={20} strokeWidth={2.5} />
        </button>

        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {bottomNavItems.map(({ icon: Icon, label, active }) => (
            <button className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`} key={label}>
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

