import { getIdTokenResult } from 'firebase/auth';
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';

import { auth, storage } from './firebaseApp';

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const VIDEO_TYPES = Object.freeze({
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
});

const configurationError =
  'Firebase video storage is not configured for this deployment.';

const createObjectId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const requireEditor = async () => {
  if (!auth || !storage) throw new Error(configurationError);

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in with an editor account before uploading a video.');
  }

  const token = await getIdTokenResult(user);
  if (user.emailVerified !== true || token.claims.editor !== true) {
    throw new Error('This Google account does not have editor access.');
  }

  return user;
};

const validateVideo = (file, blob) => {
  const contentType = file.mimeType || blob.type;
  const extension = VIDEO_TYPES[contentType];
  if (!extension) {
    throw new Error('Choose an MP4, MOV, or WebM video.');
  }

  const selectedSize = file.size;
  if (selectedSize != null && (!Number.isFinite(selectedSize) || selectedSize <= 0)) {
    throw new Error('The selected video is empty or has an invalid size.');
  }

  if (selectedSize != null && selectedSize > MAX_VIDEO_BYTES) {
    throw new Error('Videos must be 25 MiB or smaller.');
  }

  if (!Number.isFinite(blob.size) || blob.size <= 0) {
    throw new Error('The selected video is empty or could not be read.');
  }

  if (blob.size > MAX_VIDEO_BYTES) {
    throw new Error('Videos must be 25 MiB or smaller.');
  }

  return { contentType, extension };
};

export const uploadVideoToFirebase = async (file, onProgress) => {
  if (!file?.uri) throw new Error('Choose a video before uploading.');

  // Reject an oversized picker result before loading it into memory. Rules repeat
  // this check because all client-side validation can be bypassed.
  if (file.size != null && file.size > MAX_VIDEO_BYTES) {
    throw new Error('Videos must be 25 MiB or smaller.');
  }

  await requireEditor();
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('The selected video could not be read.');

  const blob = await response.blob();
  const { contentType, extension } = validateVideo(file, blob);
  const storageRef = ref(storage, `videos/${createObjectId()}.${extension}`);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType,
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(percent);
        }
      },
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};
