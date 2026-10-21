import { logoStyleOf, type LogoStyle, type Project } from '../db/db';
import { inkOn } from '../lib/color';

export type AvatarProject = Pick<Project, 'name' | 'color' | 'monogram' | 'logo'> & { logoStyle?: LogoStyle };

/** Logo of monogram in een vierkant vakje. Het logo volgt de eigen weergave-instellingen van het project. */
export function ProjectAvatar({ project, size = 36 }: { project: AvatarProject; size?: number }) {
  const radius = Math.round(size * 0.26);
  if (project.logo) {
    const s = logoStyleOf(project);
    return (
      <span
        className={`avatar logo-bg-${s.bg}`}
        style={{ width: size, height: size, borderRadius: radius, background: s.bg === 'kleur' ? project.color : undefined }}
      >
        <img
          src={project.logo}
          alt=""
          draggable={false}
          style={{ objectFit: s.fit === 'vullend' ? 'cover' : 'contain', transform: `translate(${s.x}%, ${s.y}%) scale(${s.zoom})` }}
        />
      </span>
    );
  }
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius: radius, background: project.color, color: inkOn(project.color), fontSize: Math.max(10, Math.round(size * 0.34)) }}
    >
      {project.monogram}
    </span>
  );
}

export function ProjectTag({ project }: { project: AvatarProject | undefined }) {
  if (!project) return <span className="proj-tag quiet">Geen project</span>;
  return (
    <span className="proj-tag">
      <span className="dot" style={{ background: project.color }} />
      {project.name}
    </span>
  );
}
