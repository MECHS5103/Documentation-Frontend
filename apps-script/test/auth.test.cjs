const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'Code.gs'),
  'utf8'
);

const credentialRows = [
  ['Username', 'Password', 'Last Name'],
  ['editor', 'correct horse', 'Builder'],
  ['', '', ''],
];

function loadScript(rows = credentialRows, openError = null) {
  const context = {
    console,
    Logger: { log() {} },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(content) {
        return {
          content,
          setMimeType() {
            return this;
          },
        };
      },
    },
    SpreadsheetApp: {
      openById() {
        if (openError) throw openError;
        return {
          getSheetByName() {
            return {
              getDataRange() {
                return { getValues: () => rows };
              },
            };
          },
        };
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

test('returns a last name only for an exact credential match', () => {
  const context = loadScript();
  assert.deepEqual(
    post(context, {
      action: 'doGetUserLast',
      user: 'editor',
      pass: 'correct horse',
    }),
    { status: 'success', message: 'Builder' }
  );
});

test('does not distinguish a wrong password from an unknown username', () => {
  const context = loadScript();
  const wrongPassword = post(context, {
    action: 'doGetUserLast',
    user: 'editor',
    pass: 'wrong',
  });
  const unknownUser = post(context, {
    action: 'doGetUserLast',
    user: 'nobody',
    pass: 'wrong',
  });

  assert.deepEqual(wrongPassword, {
    status: 'error',
    message: 'Access Denied',
  });
  assert.deepEqual(unknownUser, wrongPassword);
});

test('does not coerce non-string values into blank credentials', () => {
  const context = loadScript();
  assert.deepEqual(
    post(context, {
      action: 'doTestCredentials',
      user: false,
      pass: false,
    }),
    { status: 'error', message: 'Access Denied' }
  );
});

test('does not expose credential backend exception details', () => {
  const context = loadScript(undefined, new Error('private spreadsheet detail'));
  assert.deepEqual(
    post(context, {
      action: 'doGetUserLast',
      user: 'editor',
      pass: 'correct horse',
    }),
    { status: 'error', message: 'Authentication service unavailable.' }
  );
});
