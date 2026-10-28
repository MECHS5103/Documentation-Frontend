import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [uid, access = 'true'] = process.argv.slice(2);

if (!uid || !['true', 'false'].includes(access)) {
  console.error('Usage: node scripts/set-editor-claim.mjs <firebase-uid> [true|false]');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });

const editor = access === 'true';
const user = await getAuth().getUser(uid);
const currentClaims = user.customClaims || {};

await getAuth().setCustomUserClaims(uid, {
  ...currentClaims,
  editor,
});

console.log(`${editor ? 'Granted' : 'Removed'} editor access for ${uid}`);
