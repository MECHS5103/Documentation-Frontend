// Cloudflare Worker: serve Firebase's sign-in handler from docs.team5103.com.
//
// Some school networks block *.firebaseapp.com, which breaks Google sign-in. With
// EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=docs.team5103.com, the browser only talks to this
// site, and this Worker relays /__/auth/* and /__/firebase/* to the real Firebase host.
//
// Route: docs.team5103.com/__/*   (see infra/cloudflare/README.md)

const FIREBASE_HOST = 'robotics-documentation.firebaseapp.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/__/auth/') && !url.pathname.startsWith('/__/firebase/')) {
      return new Response('Not found', { status: 404 });
    }
    url.hostname = FIREBASE_HOST;
    url.port = '';
    return fetch(new Request(url.toString(), request), { redirect: 'manual' });
  },
};
