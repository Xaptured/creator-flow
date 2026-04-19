'use server';

import { signIn } from '../../../auth';

export async function signInWithKeycloak() {
  await signIn('keycloak', { redirectTo: '/dashboard' });
}
