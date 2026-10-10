"use client";

export interface TeamMemberDocument {
  type: "PAN" | "AADHAAR";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface TeamMemberDetail {
  id: string;
  role: "EMPLOYEE" | "BROKER";
  name: string;
  email: string | null;
  mobile: string;
  user_code: string | null;
  status: "ACTIVE" | "INACTIVE";
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  address: string;
  city: string;
  bankHolderName: string;
  bankName: string;
  bankIfsc: string;
  bankAccountMasked: string;
  panMasked: string;
  aadhaarMasked: string;
  documents: TeamMemberDocument[];
  designation?: string;
  joiningDate?: string | null;
  firmName?: string;
  reraNumber?: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">
        {value === null || value === undefined || value === ""
          ? "—"
          : value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-amber-900/10 bg-amber-50/30 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h4>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

interface TeamMemberViewModalProps {
  detail: TeamMemberDetail;
  documentUrl: (type: "PAN" | "AADHAAR") => string;
  onClose: () => void;
  onEdit: () => void;
}

export default function TeamMemberViewModal({
  detail,
  documentUrl,
  onClose,
  onEdit,
}: TeamMemberViewModalProps) {
  const roleLabel =
    detail.role === "EMPLOYEE" ? "Employee" : "Broker";

  const panUpload = detail.documents.find((doc) => doc.type === "PAN");
  const aadhaarUpload = detail.documents.find(
    (doc) => doc.type === "AADHAAR",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Profile of ${detail.name}`}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-semibold text-primary">
              {detail.name}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {detail.user_code ?? "No code"}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">
                {roleLabel}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  detail.status === "ACTIVE"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {detail.status === "ACTIVE" ? "Active" : "Inactive"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  detail.isVerified
                    ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {detail.isVerified ? "Verified" : "Not verified"}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Section title="Account">
            <Row label="User code" value={detail.user_code} />
            <Row label="Role" value={roleLabel} />
            <Row label="Created" value={formatDate(detail.createdAt)} />
            <Row label="Last login" value={formatDate(detail.lastLoginAt)} />
          </Section>

          <Section title="Contact">
            <Row label="Mobile" value={detail.mobile} />
            <Row label="Email" value={detail.email} />
            <Row label="Address" value={detail.address} />
            <Row label="City" value={detail.city} />
          </Section>

          <Section title="Professional">
            {detail.role === "EMPLOYEE" && (
              <>
                <Row label="Designation" value={detail.designation} />
                <Row label="Joining date" value={formatDate(detail.joiningDate)} />
              </>
            )}

            {detail.role === "BROKER" && (
              <>
                <Row label="Firm name" value={detail.firmName} />
                <Row label="RERA number" value={detail.reraNumber} />
              </>
            )}
          </Section>

          <Section title="Bank details">
            <Row label="Account holder" value={detail.bankHolderName} />
            <Row label="Bank" value={detail.bankName} />
            <Row label="IFSC" value={detail.bankIfsc} />
            <Row label="Account number" value={detail.bankAccountMasked} />
          </Section>

          <Section title="Identity documents">
            <div>
              <dt className="text-xs font-medium text-gray-400">PAN</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {detail.panMasked || "Not on file"}
              </dd>
              {panUpload && (
                <a
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                  href={documentUrl("PAN")}
                  target="_blank"
                  rel="noreferrer"
                >
                  View PAN file ({panUpload.originalName},{" "}
                  {formatSize(panUpload.sizeBytes)})
                </a>
              )}
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-400">Aadhaar</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {detail.aadhaarMasked || "Not on file"}
              </dd>
              {aadhaarUpload && (
                <a
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                  href={documentUrl("AADHAAR")}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Aadhaar file ({aadhaarUpload.originalName},{" "}
                  {formatSize(aadhaarUpload.sizeBytes)})
                </a>
              )}
            </div>
          </Section>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            Edit profile
          </button>
        </div>
      </div>
    </div>
  );
}
