import {
  CheckCircle,
  Eye,
  HourglassMedium,
  PaperPlaneTilt,
  PencilSimpleLine,
  XCircle,
} from "@phosphor-icons/react/ssr";
import type { DisplayStatus } from "@/domain/status";
import { statusLabels } from "@/lib/labels";

const icons = {
  draft: PencilSimpleLine,
  sent: PaperPlaneTilt,
  viewed: Eye,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: HourglassMedium,
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const Icon = icons[status];
  return (
    <span className={`status status-${status}`}>
      <Icon size={16} weight="bold" aria-hidden className="ic" />
      {statusLabels[status]}
    </span>
  );
}
