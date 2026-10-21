import type { Project } from '../db/db';
import { inkOn } from '../lib/color';

export type AvatarProject = Pick<Project, 'name' | 'color' | 'monogram' | 'logo'>;

export function ProjectAvatar({ project, size = 36 }: { project: AvatarProject; size?: number }) {
  const radius = Math.round(size * 0.26);
  if (project.logo) {
    return (
      <span className="avatar" style={{ width: size, height: size, borderRadius: radius }}>
        <img src={project.logo} alt="" />
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
