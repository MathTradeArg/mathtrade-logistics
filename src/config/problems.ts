import type { CityAccess } from '@/types/city';
import type { VolunteerRole } from '@/types/volunteer';
import { isPathAllowed } from '@/config/roles';

export type ProblemGroup = 'cajas' | 'participante' | 'juego';
export type ProblemId =
  | 'missing-in-box' | 'not-in-list' | 'interior-pending'
  | 'no-qr' | 'participant-missing' | 'no-show'
  | 'broken' | 'no-label' | 'where-is-game' | 'still-missing' | 'wrong-state';

export type Problem = {
  id: ProblemId;
  group: ProblemGroup;
  question: string;
  hint: string;
  path: string | ((phase: number | null) => string);
  adminOnly?: boolean;
  tone?: 'danger';
};

export const PROBLEM_GROUPS: { id: ProblemGroup; label: string }[] = [
  { id: 'cajas', label: 'En las cajas' },
  { id: 'participante', label: 'Con un participante' },
  { id: 'juego', label: 'Con un juego' },
];

export const PROBLEMS: Problem[] = [
  { id: 'missing-in-box', group: 'cajas', question: '¿Falta un juego en una caja?', hint: 'Abrí la caja, tildá los que están y reportá los que faltan', path: '/boxes/in' },
  { id: 'not-in-list', group: 'cajas', question: '¿Apareció un juego que no está en la lista?', hint: 'Cargalo como suelto, o buscá en qué caja iba', path: '/boxes/in/loose' },
  { id: 'interior-pending', group: 'cajas', question: '¿Falta que llegue algo del interior?', hint: 'Juegos y cajas pendientes por ciudad', path: '/more/tools/amba-pending' },
  { id: 'no-qr', group: 'participante', question: '¿El participante no tiene su QR?', hint: 'Buscalo por nombre', path: (phase) => (phase === 2 ? '/deliver' : '/receive') },
  { id: 'participant-missing', group: 'participante', question: '¿A un participante le faltan juegos?', hint: 'Si está en la ventanilla, mandalo con un admin', path: '/more/reports/amba-missing' },
  { id: 'no-show', group: 'participante', question: '¿Alguien no vino a retirar?', hint: 'Mirá quién retiró y marcá a los que no vinieron', path: '/admin/ready-to-pickup', adminOnly: true },
  { id: 'broken', group: 'juego', question: '¿Vino roto?', hint: 'Dejá foto y nota, y llamá a un admin', path: '/more/report' },
  { id: 'no-label', group: 'juego', question: '¿No tiene etiqueta o no se lee?', hint: 'Buscá a su dueño y mirá sus juegos', path: '/lookup?mode=participant' },
  { id: 'where-is-game', group: 'juego', question: '¿Dónde está un juego?', hint: 'Buscalo por el código de la etiqueta', path: '/lookup?mode=game' },
  { id: 'still-missing', group: 'juego', question: '¿Qué juegos siguen faltando?', hint: 'Los reportes abiertos, para buscarlos', path: '/more/reports' },
  { id: 'wrong-state', group: 'juego', question: '¿Marcaste mal un juego, o está pero figura que no llegó?', hint: 'Corregilo con el código de la etiqueta', path: '/more/tools', adminOnly: true, tone: 'danger' },
];

export type VisibleProblem = { problem: Problem; href: string | null; needsAdmin: boolean };

export function problemHref(problem: Problem, phase: number | null): string {
  return typeof problem.path === 'function' ? problem.path(phase) : problem.path;
}

/** Shown if the user can open the destination; admin-only ones are shown to
 *  everybody else without a link ("Avisá a un admin"). A user who can't open
 *  /problem itself (a city user without an event role) gets nothing. */
export function getVisibleProblems(
  access: { role: VolunteerRole | null; isAdmin: boolean; city?: CityAccess },
  phase: number | null,
): VisibleProblem[] {
  const city = access.city ?? null;
  if (!isPathAllowed('/problem', access.role, access.isAdmin, city)) return [];
  return PROBLEMS.flatMap((problem): VisibleProblem[] => {
    const href = problemHref(problem, phase);
    if (problem.adminOnly && !access.isAdmin) return [{ problem, href: null, needsAdmin: true }];
    const pathname = href.split('?')[0];
    if (!isPathAllowed(pathname, access.role, access.isAdmin, city)) return [];
    return [{ problem, href, needsAdmin: false }];
  });
}
