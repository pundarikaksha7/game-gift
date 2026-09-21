type BrandProps = {
  className?: string;
};

/** The single public Gamegift lockup used across marketing and product surfaces. */
export function Brand({ className = '' }: BrandProps) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <span className="brand-gem" aria-hidden="true">
        ✦
      </span>
      <span className="brand-word">
        game<span>gift</span>
      </span>
    </span>
  );
}
