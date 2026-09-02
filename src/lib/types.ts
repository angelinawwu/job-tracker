export interface StatusPhase {
  id: string;
  label: string;
  description: string;
  date: string; // ISO date
}

export interface Application {
  id: string;
  dateApplied: string; // ISO date (yyyy-mm-dd)
  link: string;
  company: string;
  jobTitle: string;
  referral: string;
  materials: string[];
  status: StatusPhase[]; // ordered; the last phase is the current one
  notes: string;
}

export function newApplication(): Application {
  return {
    id: crypto.randomUUID(),
    dateApplied: todayISO(),
    link: "",
    company: "",
    jobTitle: "",
    referral: "",
    materials: [],
    status: [
      {
        id: crypto.randomUUID(),
        label: "Pending",
        description: "",
        date: todayISO(),
      },
    ],
    notes: "",
  };
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
