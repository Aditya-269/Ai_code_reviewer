import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";

/**
 * Getting the GitHub access token
 */
export const getGitHubToken = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Fetch GitHub account linked to this user
  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "github",
    },
  });

  if (!account?.accessToken) {
    throw new Error("No github access token found");
  }

  return account.accessToken;
};
export async function fetchUserContribution(
    token: string,
    username: string
  ) {
    const octokit = new Octokit({ auth: token });
  
    const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                color
              }
            }
          }
        }
      }
    }
  `;
      try {
        const response:any = await octokit.graphql(query, {
          username,
        });
        return response.user.contributionsCollection.contributionCalendar;
      
      } catch (error) {
        console.error("GitHub contribution fetch failed:", error);
        throw error;
      }
  
  }
export const getRepositories = async (
  page: number = 1,
  perPage: number = 10
) => {
  const token = await getGitHubToken();
  
    const octokit = new Octokit({
      auth: token,
    });
  
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      direction: "desc",
      visibility: "all",
      per_page: perPage,
      page: page,
    });
  
  return data;
};
export const createWebhook = async (owner: string, repo: string) => {
  const token = await getGitHubToken();
  const octokit = new Octokit({ auth: token });

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`;

  const { data: hooks } = await octokit.rest.repos.listWebhooks({
    owner,
    repo
  });

  const existingHook = hooks.find(hook => hook.config.url === webhookUrl);
  if (existingHook) {
    return existingHook;
  }
  const { data } = await octokit.rest.repos.createWebhook({
  owner,
  repo,
  config: {
    url: webhookUrl,
    content_type: "json"
  },
  events: ["pull_request"]
});
return data;
}

export const deleteWebhook = async (owner: string, repo: string) => {
  const token = await getGitHubToken();
  const octokit = new Octokit({ auth: token });
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`;

  try {
    const { data: hooks } = await octokit.rest.repos.listWebhooks({
      owner,
      repo
    });

    const hookToDelete = hooks.find(hook => hook.config.url === webhookUrl);

    if (hookToDelete) {
      await octokit.rest.repos.deleteWebhook({
        owner,
        repo,
        hook_id: hookToDelete.id
      })
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return false;
  }
};


export async function getRepoFileContents(
  token: string,
  owner: string,
  repo: string,
  path: string = ""
): Promise<{ path: string; content: string }[]> {
  const octokit = new Octokit({ auth: token });

  const isIgnored = (filePath: string) => {
    const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.tar', '.gz', '.mp4', '.mp3', '.lock', '.lockb'];
    const ignoredFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb', '.DS_Store'];
    const ignoredDirs = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];

    const fileName = filePath.split('/').pop() || '';
    if (ignoredFiles.includes(fileName)) return true;
    if (ignoredExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) return true;
    if (ignoredDirs.some(dir => filePath === dir || filePath.startsWith(`${dir}/`) || filePath.includes(`/${dir}/`))) return true;
    return false;
  };

  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if (!Array.isArray(data)) {
    if (data.type === "file" && data.content && !isIgnored(data.path)) {
      return [
        {
          path: data.path,
          content: Buffer.from(data.content, "base64").toString("utf-8"),
        },
      ];
    }
    return [];
  }

  let files: { path: string; content: string }[] = [];

  for (const item of data) {
    if (isIgnored(item.path)) continue;

    if (item.type === "file") {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: item.path,
      });

      if (
        !Array.isArray(fileData) &&
        fileData.type === "file" &&
        fileData.content
      ) {
        files.push({
          path: item.path,
          content: Buffer.from(fileData.content, "base64").toString("utf-8"),
        });
      }
    } else if (item.type === "dir") {
      const subFiles = await getRepoFileContents(token, owner, repo, item.path);
      files = files.concat(subFiles);
    }
  }

  return files;
}
export async function getPullRequestDiff(
    token: string,
    owner: string,
    repo: string,
    prNumber: number
) {
    const octokit = new Octokit({ auth: token });

    const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber
    });

const { data: diff } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: {
        format: "diff"
    }
});

return {
    diff: diff as unknown as string,
    title: pr.title,
    description: pr.body || ""
};
}

export async function postReviewComment(
    token: string,
    owner: string,
    repo: string,
    prNumber: number,
    review: string
) {
    const octokit = new Octokit({ auth: token });

    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `# AI Code Review\n\n${review}\n\n---\n*Powered by BUGLENS`,
    });
}