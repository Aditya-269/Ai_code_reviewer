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