import React from 'react';

export interface LoginCTAProps {
  href?: string;
  target?: string;
  rel?: string;
  children?: React.ReactNode;
}

export const LoginCTA: React.FC<LoginCTAProps> = ({ href = 'https://www.matecore.com.ar/', target = '_blank', rel = 'noopener noreferrer', children }) => {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="login-cta w-full h-12 rounded-xl overflow-hidden relative focus:outline-none"
      aria-label="Conoce Matecore"
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
      <span className="cta-label font-semibold">{children ?? 'Conoce Matecore'}</span>
    </a>
  );
};

export default LoginCTA;


