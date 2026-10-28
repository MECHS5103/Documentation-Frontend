import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const getRevision = () => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
};

const sha256 = async (file) => {
  const contents = await readFile(file);
  return createHash('sha256').update(contents).digest('hex');
};

const sha256IfPresent = async (file) => {
  try {
    return await sha256(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

await stat(dist);
await mkdir(dist, { recursive: true });

for (const file of ['.nojekyll', '404.html', 'CNAME']) {
  await copyFile(path.join(root, file), path.join(dist, file));
}

const metadata = {
  sourceRepository:
    process.env.GITHUB_REPOSITORY || 'MECHS5103/Documentation-Frontend',
  sourceRevision: getRevision(),
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  builtAt: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
  inputs: {
    lockfileSha256: await sha256(path.join(root, 'package-lock.json')),
    appsScriptSha256: await sha256(path.join(root, 'apps-script/src/Code.gs')),
    firebaseConfigSha256: await sha256IfPresent(
      path.join(root, 'firebase.json')
    ),
    firebaseStorageRulesSha256: await sha256IfPresent(
      path.join(root, 'firebase', 'storage.rules')
    ),
  },
};

await writeFile(
  path.join(dist, 'build-metadata.json'),
  `${JSON.stringify(metadata, null, 2)}\n`,
  'utf8'
);

console.log(
  `Prepared GitHub Pages artifact for ${metadata.sourceRevision.slice(0, 12)}`
);
