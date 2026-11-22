import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { AuthLayout } from '@/components/AuthLayout';

export const metadata = { title: 'Sign in · Villa Blueprint' };

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthLayout>
  );
}
