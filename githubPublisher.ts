// githubPublisher.ts
// Publishes a rendered CV HTML page to a GitHub repo that has GitHub Pages enabled.

const GITHUB_API = "https://api.github.com";

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Publishes (creates or updates) a static HTML file to the configured GitHub repo.
 * Uses the Contents API: PUT /repos/{owner}/{repo}/contents/{path}
 */
export async function publishHtmlToGitHub(
  username: string,
  htmlContent: string
): Promise<PublishResult> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_PAGES_REPO;

  if (!token || !owner || !repo) {
    return {
      success: false,
      error: "GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_PAGES_REPO is missing from environment variables.",
    };
  }

  const filePath = `cv/${username}/index.html`;
  const apiUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    // 1. Check if the file already exists (need its SHA to update it)
    let existingSha: string | undefined;
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (getRes.ok) {
      const existingData = await getRes.json();
      existingSha = existingData.sha;
    }

    // 2. Create or update the file
    const contentBase64 = Buffer.from(htmlContent, "utf-8").toString("base64");

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Publish CV for ${username}`,
        content: contentBase64,
        sha: existingSha, // undefined is fine for new files
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return {
        success: false,
        error: `GitHub API error (${putRes.status}): ${errData.message || putRes.statusText}`,
      };
    }

    const pagesUrl = `https://${owner}.github.io/${repo}/cv/${username}/`;
    return { success: true, url: pagesUrl };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}