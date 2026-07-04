export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditLog {
  id: string;
  user: number | null;
  username: string;
  action: AuditAction;
  action_label: string;
  module: string;
  module_label: string;
  target_model: string;
  target_id: string;
  target_repr: string;
  affected_summary: string;
  metadata: Record<string, unknown>;
  message: string;
  created_at: string;
  updated_at: string;
}
