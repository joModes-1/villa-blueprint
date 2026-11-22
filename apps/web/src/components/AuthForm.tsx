'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError, errorMessage, fieldErrors } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/fields';
import { Banner } from '@/components/ui/display';

export function validateAuth(mode: 'login' | 'signup', v: { name: string; email: string; password: string }): Record<string, string> {
  const e: Record<string, string> = {};
  if (mode === 'signup' && v.name.trim() === '') e.name = 'Enter your name.';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (mode === 'signup' ? v.password.length < 10 : v.password.length === 0) {
    e.password = mode === 'signup' ? 'Use at least 10 characters.' : 'Enter your password.';
  }
  return e;
}

export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/projects';
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const params = useSearchParams();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const local = validateAuth(mode, values);
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    setBusy(true);
    try {
      await api(signup ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        body: signup ? values : { email: values.email, password: values.password },
      });
      window.location.assign(safeNext(params.get('next')));
    } catch (err) {
      const fields = fieldErrors(err);
      if (Object.keys(fields).length > 0) setErrors(fields);
      else if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setErrors({ email: err.message });
      else setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label={signup ? 'Create your account' : 'Sign in'}>
      {formError ? <Banner tone="danger">{formError}</Banner> : null}
      {signup ? (
        <Input label="Name" autoComplete="name" value={values.name} error={errors.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      ) : null}
      <Input label="Email" type="email" autoComplete="email" value={values.email} error={errors.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
      <Input
        label="Password"
        type="password"
        autoComplete={signup ? 'new-password' : 'current-password'}
        hint={signup ? 'At least 10 characters.' : undefined}
        value={values.password}
        error={errors.password}
        onChange={(e) => setValues({ ...values, password: e.target.value })}
      />
      <Button type="submit" loading={busy} className="w-full">
        {signup ? 'Create account' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted">
        {signup ? 'Already have an account? ' : 'New here? '}
        <Link href={signup ? '/login' : '/signup'} className="font-semibold text-primary underline">
          {signup ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
