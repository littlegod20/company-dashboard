"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface FileInputState {
  file: File | null;
  error: string | null;
}

function FileInput({
  id,
  label,
  description,
  state,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  state: FileInputState;
  onChange: (file: File | null, error: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      onChange(null, null);
      return;
    }
    if (!file.name.endsWith(".xlsx")) {
      onChange(null, "Only .xlsx files are accepted.");
      // reset the input so the user can pick again
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange(file, null);
  }

  return (
    <div
      className={`rounded-lg border-2 p-5 transition-colors ${
        state.error
          ? "border-red-400 bg-red-50"
          : state.file
          ? "border-green-400 bg-green-50"
          : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <label htmlFor={id} className="block mb-1 font-semibold text-slate-800">
        {label}
      </label>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".xlsx"
        onChange={handleChange}
        className="block w-full text-sm text-slate-600
          file:mr-3 file:py-1.5 file:px-4
          file:rounded file:border-0
          file:text-sm file:font-medium
          file:bg-slate-800 file:text-white
          hover:file:bg-slate-700 cursor-pointer"
      />
      {state.file && (
        <p className="mt-2 text-sm text-green-700 font-medium">
          ✓ {state.file.name} ({(state.file.size / 1024).toFixed(0)} KB)
        </p>
      )}
      {state.error && (
        <p className="mt-2 text-sm text-red-600 font-medium">✕ {state.error}</p>
      )}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();

  const [sales, setSales] = useState<FileInputState>({ file: null, error: null });
  const [hr, setHr] = useState<FileInputState>({ file: null, error: null });
  const [finance, setFinance] = useState<FileInputState>({ file: null, error: null });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Client-side validation: all 3 files must be selected
    const missing: string[] = [];
    if (!sales.file) missing.push("Sales Transactions");
    if (!hr.file) missing.push("Employee / HR Data");
    if (!finance.file) missing.push("Finance Targets");
    if (missing.length > 0) {
      setSubmitError(`Please select a file for: ${missing.join(", ")}`);
      return;
    }

    const formData = new FormData();
    formData.append("sales", sales.file!);
    formData.append("hr", hr.file!);
    formData.append("finance", finance.file!);

    setSubmitting(true);
    setProgress("Uploading and processing files…");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      setProgress(
        `Done! Processed ${data.summary.enrichedRows} rows. Redirecting…`
      );
      // Brief pause so the user sees the success message before redirect
      setTimeout(() => router.push("/dashboard/sales"), 1000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Import Data</h1>
        <p className="text-slate-600">
          Upload all three Excel files to populate the dashboards. Each file
          must be <code className="bg-slate-200 px-1 rounded text-sm text-slate-800">.xlsx</code> format.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FileInput
          id="sales"
          label="Sales Transactions"
          description="Date, rep name, region, product, amount, customer"
          state={sales}
          onChange={(file, error) => setSales({ file, error })}
        />
        <FileInput
          id="hr"
          label="Employee / HR Data"
          description="Rep name, region, department, hire date, monthly target"
          state={hr}
          onChange={(file, error) => setHr({ file, error })}
        />
        <FileInput
          id="finance"
          label="Finance Targets"
          description="Region, month, revenue target, department cost"
          state={finance}
          onChange={(file, error) => setFinance({ file, error })}
        />

        {submitError && (
          <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700">
            <strong>Error:</strong> {submitError}
          </div>
        )}

        {progress && !submitError && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            {progress}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-6 bg-slate-900 text-white font-semibold rounded-lg
            hover:bg-slate-700 disabled:bg-slate-500 disabled:cursor-not-allowed
            transition-colors text-sm"
        >
          {submitting ? "Processing…" : "Upload & Process Files"}
        </button>
      </form>
    </div>
  );
}
