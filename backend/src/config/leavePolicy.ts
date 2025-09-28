// Centralized leave encashment policy for Pakistan context.
// We won't change existing leave type labels in the system.

export type EncashmentPolicy = {
  // Exact labels that are encashable today (in-service). Typically only 'Earned Leave'.
  encashableTypes: string[];
  // Maximum number of days that can be encashed in-service at once. 0 = no explicit cap in system (use available balance).
  maxEncashableInServiceAtOnce: number;
  // Reference cap for retirement/LPR encashment (informational only here; actual processing will be separate).
  maxEncashableAtRetirement: number;
};

export const leaveEncashmentPolicy: EncashmentPolicy = {
  encashableTypes: [
    // Pakistani public-sector practice: Encashment applies to Earned Leave only.
    'Earned Leave',
  ],
  // Some orgs cap in-service encashment; keep 0 to indicate "up to available" unless business sets a cap later.
  maxEncashableInServiceAtOnce: 0,
  // At retirement, up to 365 days encashment (typical civil service policy). Informational; not enforced here.
  maxEncashableAtRetirement: 365,
};
