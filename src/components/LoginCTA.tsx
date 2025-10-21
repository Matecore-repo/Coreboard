import React from 'react';

export interface LoginCTAProps {
  onClick?: () => void;
  children?: React.ReactNode;
}

export const LoginCTA: React.FC<LoginCTAProps> = ({ onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="login-cta w-full h-12 rounded-xl overflow-hidden relative focus:outline-none"
      aria-label="Explorar la app"
    >
      {/* Glass base */}
      <span className="cta-glass" />

      {/* Bubbles (light, subtle, contained) */}
      <span className="bubble bubble-1" />
      <span className="bubble bubble-2" />
      <span className="bubble bubble-3" />
      <span className="bubble bubble-4" />
      <span className="bubble bubble-5" />
      <span className="bubble bubble-6" />

      {/* Specular highlight */}
      <span className="cta-shine" />

      {/* Label */}
      <span className="cta-label font-semibold">{children ?? 'Explorar la app'}</span>
    </button>
  );
};

export default LoginCTA;


