import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { AuthLayout } from '@/components/AuthLayout';

export const metadata = { title: 'Create account · Villa Blueprint' };

export default function SignupPage() {
  return (
    <AuthLayout title="Create your account">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthLayout>
  );
}
