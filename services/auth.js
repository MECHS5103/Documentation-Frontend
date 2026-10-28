import {
  GoogleAuthProvider,
  browserSessionPersistence,
  getIdToken,
  getIdTokenResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
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

export const signInEditor = async () => {
  const configuredAuth = requireAuth();
  await setPersistence(configuredAuth, browserSessionPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(configuredAuth, provider);
  try {
    return await requireEditorClaim(result.user, true);
  } catch (error) {
    await signOut(configuredAuth);
    throw error;
  }
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
