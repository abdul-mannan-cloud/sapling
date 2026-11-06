export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle-switch">
      <span className="toggle-switch-label">{label}</span>
      <span className={`toggle-switch-track${checked ? ' on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-switch-knob" aria-hidden="true" />
      </span>
    </label>
  );
}
