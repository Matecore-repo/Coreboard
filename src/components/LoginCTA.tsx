import React from 'react';

export interface LoginCTAProps {
  onClick?: () => void;
  children?: React.ReactNode;
}

export const LoginCTA: React.FC<LoginCTAProps> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="login-cta w-full h-11 rounded-lg overflow-hidden relative"
      aria-label="Explorar la app"
    >
      <span className="cta-bg absolute inset-0 bg-gradient-to-r from-pink-500 via-yellow-400 to-green-400" />
      <span className="cta-shine absolute inset-0 opacity-0 group-hover:opacity-80 transition-all duration-700 pointer-events-none" />
      <span className="cta-label relative z-10 text-black dark:text-white font-semibold">{children ?? 'Explorar la app'}</span>
    </button>
  );
};

export default LoginCTA;


