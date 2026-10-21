import { NavLink } from 'react-router-dom';
import { BrandMark, Icon, type IconName } from './Icon';
import { useProjects, useRunning, useSetting, useTasks } from '../lib/hooks';
import { dayKey } from '../lib/time';
import pkg from '../../package.json';

function Item({ to, icon, label, badge, end }: { to: string; icon: IconName; label: string; badge?: number; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <Icon name={icon} />
      <span className="grow">{label}</span>
      {!!badge && <span className="nav-badge" aria-label={`${badge} open`}>{badge}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const projects = useProjects();
  const tasks = useTasks();
  const running = useRunning();
  const name = useSetting<string>('userName', '');
  const today = dayKey(Date.now());
  const dueNow = tasks.filter((t) => !t.done && t.due !== null && t.due <= today).length;

  return (
    <nav className="sidebar" aria-label="Hoofdnavigatie">
      <NavLink to="/" className="brand" aria-label="WhistleRocket, naar Vandaag">
        <BrandMark />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="brand-name">WhistleRocket</span>
          <span className="brand-tag">Impossible to ignore</span>
        </span>
      </NavLink>

      <Item to="/" end icon="grid" label="Vandaag" />
      <Item to="/taken" icon="check" label="Taken" badge={dueNow} />
      <Item to="/uren" icon="clock" label="Uren" />
      <Item to="/footprint" icon="map" label="Footprint" />

      <div className="nav-heading">Projecten</div>
      {projects.map((p) => (
        <NavLink key={p.id} to={`/project/${p.id}`} className={({ isActive }) => `nav-project${isActive ? ' active' : ''}`}>
          <span className="dot" style={{ background: p.color }} />
          <span className="name">{p.name}</span>
          {running?.projectId === p.id && <span className="live" aria-label="timer loopt" />}
        </NavLink>
      ))}
      {projects.length === 0 && <span className="quiet" style={{ padding: '4px 12px', fontSize: 13 }}>Nog geen projecten</span>}

      <div className="spacer" />
      <Item to="/instellingen" icon="settings" label="Instellingen" />
      <div className="row" style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'var(--raised)', border: '1px solid var(--line)' }}>
        <span className="avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: '#F5B451', color: '#0D0F13', fontSize: 12 }}>
          {(name || 'Jij').charAt(0).toUpperCase()}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{name || 'Jij'}</span>
          <span className="quiet" style={{ fontSize: 12 }}>Eigen gebruik · v{pkg.version}</span>
        </span>
      </div>
    </nav>
  );
}
