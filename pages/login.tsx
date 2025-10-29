import dynamic from 'next/dynamic';

const LoginView = dynamic(() => import('../src/components/views/LoginView'), { ssr: false });

export default function LoginPage() {
  return <LoginView />;
}

