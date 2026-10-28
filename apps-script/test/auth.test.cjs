const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'Code.gs'),
  'utf8'
);

const projectId = 'robotics-documentation';

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const makeToken = (overrides = {}) => {
  const payload = {
    sub: 'editor-uid',
    aud: projectId,
    iss: `https://securetoken.google.com/${projectId}`,
    editor: true,
    firebase: { sign_in_provider: 'google.com' },
    ...overrides,
  };
  return `${encode({ alg: 'RS256' })}.${encode(payload)}.signature`;
};

const validAccount = {
  users: [
    {
      localId: 'editor-uid',
      email: 'editor@example.com',
      emailVerified: true,
      displayName: 'Example Editor',
      disabled: false,
    },
  ],
};

function loadScript({ responseCode = 200, responseBody = validAccount } = {}) {
  const context = {
    console,
    encodeURIComponent,
    JSON,
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            return {
              FIREBASE_WEB_API_KEY: 'public-api-key',
              FIREBASE_PROJECT_ID: projectId,
            }[name];
          },
        };
      },
    },
    UrlFetchApp: {
      fetch() {
        return {
          getResponseCode: () => responseCode,
          getContentText: () => JSON.stringify(responseBody),
        };
      },
    },
    Utilities: {
      base64DecodeWebSafe(value) {
        return Buffer.from(value, 'base64url');
      },
      newBlob(value) {
        return { getDataAsString: () => Buffer.from(value).toString('utf8') };
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(content) {
        return { content, setMimeType() { return this; } };
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function post(context, payload) {
  const response = context.doPost({
    postData: { contents: JSON.stringify(payload) },
  });
  return JSON.parse(response.content);
}

test('accepts a validated Google editor token', () => {
  const context = loadScript();
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.verifyEditorToken(makeToken()))),
    {
      uid: 'editor-uid',
      email: 'editor@example.com',
      displayName: 'Example Editor',
    }
  );
});

for (const [name, token] of [
  ['missing editor claim', makeToken({ editor: false })],
  ['wrong project', makeToken({ aud: 'other-project' })],
  ['wrong issuer', makeToken({ iss: 'https://issuer.invalid' })],
  ['wrong provider', makeToken({ firebase: { sign_in_provider: 'password' } })],
  ['subject mismatch', makeToken({ sub: 'other-user' })],
]) {
  test(`rejects ${name}`, () => {
    const context = loadScript();
    assert.throws(() => context.verifyEditorToken(token), /Unauthorized/);
  });
}

test('rejects a token that Identity Toolkit does not validate', () => {
  const context = loadScript({ responseCode: 400, responseBody: {} });
  assert.throws(() => context.verifyEditorToken(makeToken()), /Unauthorized/);
});

test('rejects disabled and unverified accounts', () => {
  const context = loadScript({
    responseBody: {
      users: [{ ...validAccount.users[0], disabled: true, emailVerified: false }],
    },
  });
  assert.throws(() => context.verifyEditorToken(makeToken()), /Unauthorized/);
});

test('rejects anonymous mutations before any spreadsheet access', () => {
  const context = loadScript({ responseCode: 400, responseBody: {} });
  assert.deepEqual(
    post(context, {
      action: 'saveContent',
      idToken: 'not-a-valid-token',
      category: 'Test',
      section: 'Security',
      lesson: 'Denied',
      tocData: [],
      pageElements: [],
    }),
    { status: 'error', message: 'Access Denied', code: 'ACCESS_DENIED' }
  );
});

test('rejects unknown actions instead of falling through to writes', () => {
  const context = loadScript();
  assert.deepEqual(post(context, { action: 'unknown' }), {
    status: 'error',
    message: 'Unsupported action.',
    code: 'UNSUPPORTED_ACTION',
  });
});

test('ignores client-supplied credits and derives the current contributor', () => {
  const context = loadScript();
  const result = context.applyAuthenticatedContributor(
    [
      { type: 'Paragraph', text: 'Hello' },
      { type: 'Credits', text: 'Forged Person' },
    ],
    ['Earlier Editor'],
    { uid: 'editor-uid', displayName: 'Example Editor' }
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { type: 'Paragraph', text: 'Hello' },
    { type: 'Credits', text: 'Earlier Editor, Example Editor' },
  ]);
});
