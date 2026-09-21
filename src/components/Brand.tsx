type BrandProps = {
  className?: string;
};

export function Brand({ className = '' }: BrandProps) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <span className="brand-gem" aria-hidden="true">
        ✦
      </span>
      <span className="brand-word">
        Game<span>Gift</span>
      </span>
    </span>
  );
}
