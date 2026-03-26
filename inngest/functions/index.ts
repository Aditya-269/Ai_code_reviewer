import { inngest } from "@/inngest/client";
import { getRepoFileContents } from "@/module/github/lib/github";
import { indexCodebase } from "@/module/ai/lib/rag";
import prisma from "@/lib/db";

export const indexRepo = inngest.createFunction(
  { id: "index-repo", triggers: [{ event: "repository.connected" }] },
  async ({ event, step }) => {
    const { owner, repo, userId } = event.data;

    // Step 1: Fetch the GitHub access token for this user
    const account = await step.run("get-github-token", async () => {
      const acc = await prisma.account.findFirst({
        where: {
          userId: userId,
          providerId: "github",
        },
      });

      if (!acc?.accessToken) {
        throw new Error("No GitHub access token found for user");
      }

      return acc;
    });

    // Step 2: Fetch all files from the repository
    const files = await step.run("fetch-repo-files", async () => {
      return await getRepoFileContents(account.accessToken!, owner, repo);
    });

    // Step 3: Index the codebase into Pinecone via embeddings
    await step.run("index-codebase", async () => {
      return await indexCodebase(`${owner}/${repo}`, files);
    });

    return {
      success: true,
      indexedFiles: files.length,
    };
  }
);