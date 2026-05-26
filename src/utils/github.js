const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = require('./config');

const BASE = 'https://api.github.com';

function headers() {
  return {
    'Authorization': `Bearer ${GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'phstoolbot/1.0',
  };
}

/**
 * Fetch a file from the repo. Returns { content, sha } or null if not found.
 */
async function getFile(filePath) {
  const url = `${BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { content, sha: data.sha };
}

/**
 * Write (create or update) a file in the repo.
 * @param {string} filePath - Path in the repo
 * @param {string} content  - File content (text) or base64 string if binary=true
 * @param {string} commitMessage - Commit message (without [AUTOMATED] prefix)
 * @param {string|null} sha - Existing file SHA for updates, null for new files
 * @param {boolean} binary - If true, content is already a base64 string (for images etc.)
 */
async function putFile(filePath, content, commitMessage, sha = null, binary = false) {
  const url = `${BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const body = {
    message: `[AUTOMATED] ${commitMessage}`,
    content: binary ? content : Buffer.from(content, 'utf8').toString('base64'),
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

module.exports = { getFile, putFile };
