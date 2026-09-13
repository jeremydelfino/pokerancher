export function Egg() {
  return (
    <svg className="egg-art" viewBox="0 0 120 150" aria-hidden="true">
      <defs>
        <linearGradient id="egg-shell" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fffdf7" />
          <stop offset="55%" stopColor="#fdf0d8" />
          <stop offset="100%" stopColor="#f0d9ae" />
        </linearGradient>
      </defs>
      <path
        d="M60 4c26 0 52 40 52 76a52 52 0 0 1-104 0C8 44 34 4 60 4Z"
        fill="url(#egg-shell)"
        stroke="#e2cfa6"
        strokeWidth="2"
      />
      <ellipse cx="42" cy="46" rx="13" ry="17" fill="#fff" opacity="0.55" />
      <g fill="var(--amber)" opacity="0.55">
        <ellipse cx="78" cy="66" rx="11" ry="9" />
        <ellipse cx="46" cy="96" rx="13" ry="10" />
        <ellipse cx="82" cy="110" rx="8" ry="7" />
      </g>
      <g fill="var(--coral)" opacity="0.35">
        <ellipse cx="60" cy="74" rx="7" ry="6" />
        <ellipse cx="34" cy="70" rx="6" ry="5" />
      </g>
    </svg>
  );
}
