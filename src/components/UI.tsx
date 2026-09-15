import { useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose}>
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-control">{children}</span>
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
export function UploadButton({
  label,
  accept,
  onFile,
  disabled = false,
}: {
  label: string;
  accept: string;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`upload-btn ${disabled ? 'disabled' : ''}`}>
      <Upload size={15} />
      {label}
      <input
        type="file"
        disabled={disabled}
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}
