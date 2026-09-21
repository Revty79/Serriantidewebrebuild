export const PERMANENT_DELETION_ENVIRONMENT_VARIABLE =
  "SERRIAN_TIDE_ENABLE_PERMANENT_DELETION";

export type PermanentDeletionEnvironment = {
  NODE_ENV?: string;
  SERRIAN_TIDE_ENABLE_PERMANENT_DELETION?: string;
};

export function isPermanentDeletionEnabled(
  environment: PermanentDeletionEnvironment = process.env,
): boolean {
  return environment.NODE_ENV !== "production"
    || environment.SERRIAN_TIDE_ENABLE_PERMANENT_DELETION === "true";
}

export function assertPermanentDeletionEnabled(
  environment: PermanentDeletionEnvironment = process.env,
): void {
  if (!isPermanentDeletionEnabled(environment)) {
    throw new Error(
      `Permanent deletion is disabled in production by recovery protection. Set ${PERMANENT_DELETION_ENVIRONMENT_VARIABLE}=true on the server only after recovery has been proven.`,
    );
  }
}

export function normalizeLifecycleReason(reason?: string): string {
  const normalized = reason?.trim() ?? "";
  if (normalized.length > 1000) {
    throw new Error("Lifecycle reasons cannot exceed 1,000 characters.");
  }
  return normalized;
}
