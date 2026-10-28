const fs = require('node:fs');
const path = require('node:path');
const { after, afterEach, before, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  deleteObject,
  getBytes,
  listAll,
  ref,
  uploadBytes,
} = require('firebase/storage');

const PROJECT_ID = 'demo-team5103-storage';
const VALID_PATH = 'videos/validcreate1234567890abcdef.mp4';
const OVERWRITE_PATH = 'videos/overwrite1234567890abcdef.mp4';
const PUBLIC_PATH = 'videos/publicread1234567890abcdef.mp4';
const DELETE_PATH = 'videos/deletetest1234567890abcdef.mp4';
const VALID_VIDEO = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);

let testEnvironment;

const storageFor = (uid, claims = {}) => {
  const context = uid
    ? testEnvironment.authenticatedContext(uid, claims)
    : testEnvironment.unauthenticatedContext();
  return context.storage();
};

const validMetadata = { contentType: 'video/mp4' };

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      host: '127.0.0.1',
      port: 9199,
      rules: fs.readFileSync(
        path.join(__dirname, '..', 'firebase', 'storage.rules'),
        'utf8'
      ),
    },
  });
  await testEnvironment.clearStorage();
});

afterEach(async () => {
  await testEnvironment.clearStorage();
});

after(async () => {
  await testEnvironment.cleanup();
});

test('only a verified editor can create a valid video', async () => {
  await assertFails(
    uploadBytes(ref(storageFor(null), VALID_PATH), VALID_VIDEO, validMetadata)
  );
  await assertFails(
    uploadBytes(
      ref(storageFor('member', { email_verified: true }), VALID_PATH),
      VALID_VIDEO,
      validMetadata
    )
  );
  await assertFails(
    uploadBytes(
      ref(storageFor('editor', { editor: true, email_verified: false }), VALID_PATH),
      VALID_VIDEO,
      validMetadata
    )
  );

  await assertSucceeds(
    uploadBytes(
      ref(storageFor('editor', { editor: true, email_verified: true }), VALID_PATH),
      VALID_VIDEO,
      validMetadata
    )
  );
});

test('writes outside the videos path are denied', async () => {
  await assertFails(
    uploadBytes(
      ref(
        storageFor('editor', { editor: true, email_verified: true }),
        'documents/1234567890abcdef1234567890abcdef.mp4'
      ),
      VALID_VIDEO,
      validMetadata
    )
  );
});

test('unsupported content types and mismatched extensions are denied', async () => {
  const editorStorage = storageFor('editor', {
    editor: true,
    email_verified: true,
  });

  await assertFails(
    uploadBytes(ref(editorStorage, VALID_PATH), VALID_VIDEO, {
      contentType: 'text/plain',
    })
  );
  await assertFails(
    uploadBytes(
      ref(editorStorage, 'videos/1234567890abcdef1234567890abcdef.webm'),
      VALID_VIDEO,
      validMetadata
    )
  );
});

test('empty and oversized videos are denied', async () => {
  const editorStorage = storageFor('editor', {
    editor: true,
    email_verified: true,
  });

  await assertFails(
    uploadBytes(ref(editorStorage, VALID_PATH), new Uint8Array(), validMetadata)
  );
  await assertFails(
    uploadBytes(
      ref(editorStorage, VALID_PATH),
      new Uint8Array(25 * 1024 * 1024 + 1),
      validMetadata
    )
  );
});

test('existing objects cannot be overwritten', async () => {
  const editorStorage = storageFor('editor', {
    editor: true,
    email_verified: true,
  });
  const objectRef = ref(editorStorage, OVERWRITE_PATH);

  await assertSucceeds(uploadBytes(objectRef, VALID_VIDEO, validMetadata));
  await assertFails(uploadBytes(objectRef, VALID_VIDEO, validMetadata));
});

test('individual videos are public but bucket listing is denied', async () => {
  const editorStorage = storageFor('editor', {
    editor: true,
    email_verified: true,
  });
  await assertSucceeds(
    uploadBytes(ref(editorStorage, PUBLIC_PATH), VALID_VIDEO, validMetadata)
  );

  const anonymousStorage = storageFor(null);
  const downloaded = await assertSucceeds(
    getBytes(ref(anonymousStorage, PUBLIC_PATH))
  );
  assert.equal(downloaded.byteLength, VALID_VIDEO.byteLength);
  await assertFails(listAll(ref(anonymousStorage, 'videos')));
  await assertFails(listAll(ref(editorStorage, 'videos')));
});

test('only a verified editor can delete videos', async () => {
  const editorStorage = storageFor('editor', {
    editor: true,
    email_verified: true,
  });
  await assertSucceeds(
    uploadBytes(ref(editorStorage, DELETE_PATH), VALID_VIDEO, validMetadata)
  );

  await assertFails(deleteObject(ref(storageFor(null), DELETE_PATH)));
  await assertFails(
    deleteObject(
      ref(storageFor('member', { email_verified: true }), DELETE_PATH)
    )
  );
  await assertSucceeds(deleteObject(ref(editorStorage, DELETE_PATH)));
});
