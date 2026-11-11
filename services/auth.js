import {
  GoogleAuthProvider,
  browserSessionPersistence,
  getIdToken,
  getIdTokenResult,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';

import { auth } from './firebaseApp';

const configurationError =
  'Firebase authentication is not configured for this deployment.';

const requireAuth = () => {
  if (!auth) throw new Error(configurationError);
  return auth;
};

const requireEditorClaim = async (user, forceRefresh = false) => {
  const token = await getIdTokenResult(user, forceRefresh);
  if (user.emailVerified !== true || token.claims.editor !== true) {
    throw new Error('This Google account does not have editor access.');
  }
  return user;
};

// Sign-in is a full-page redirect rather than a popup. School networks often block
// the popup or the firebaseapp.com handler it opens; the redirect runs through this
// site's own domain (see infra/cloudflare/auth-proxy-worker.js) and has no popup to block.
export const signInEditor = async () => {
  const configuredAuth = requireAuth();
  await setPersistence(configuredAuth, browserSessionPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  await signInWithRedirect(configuredAuth, provider);
};

// Call once on page load. Surfaces errors from a redirect sign-in (for example, a
// Google account that is not an editor); a successful sign-in is picked up by
// observeEditorAuthState.
export const completeRedirectSignIn = async () => {
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  if (!result) return null;
  try {
    await requireEditorClaim(result.user, true);
  } catch (error) {
    await signOut(auth);
    throw error;
  }
  return result.user;
};

export const observeEditorAuthState = (listener) => {
  if (!auth) {
    listener(null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      listener(null);
      return;
    }

    try {
      listener(await requireEditorClaim(user));
    } catch {
      await signOut(auth);
      listener(null);
    }
  });
};

export const signOutEditor = async () => {
  if (auth) await signOut(auth);
};

export const getEditorIdToken = async () => {
  const configuredAuth = requireAuth();
  if (!configuredAuth.currentUser) {
    throw new Error('Sign in with an editor account before saving.');
  }

  const user = await requireEditorClaim(configuredAuth.currentUser);
  return getIdToken(user);
};
