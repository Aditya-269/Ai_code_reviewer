import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { canCreateReview,increamentReviewCount } from "@/module/payment/lib/subscription";
export async function reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
) {
    try {
        const repository = await prisma.repository.findUnique({
            where: {
                owner_name: { owner, name: repo }
            },
            include: {
                user: {
                    include: {
                        accounts: {
                            where: { providerId: "github" }
                        }
                    }
                }
            }
        });

        if (!repository) {
            throw new Error(`Repository ${owner}/${repo} not found in database. Please reconnect the repository.`);
        }
        const canReview = await canCreateReview(repository.user.id, repository.id);
        if (!canReview) {
            throw new Error("You have exceeded your review limit. Please upgrade to a pro plan.");
        }

        const githubAccount = repository.user.accounts[0];
        if (!githubAccount?.accessToken) {
            throw new Error("No GitHub access token found for repository owner.");
        }

        console.log(`Sending pr.review.requested event for ${owner}/${repo} #${prNumber}`);

        await inngest.send({
            name: "pr.review.requested",
            data: {
                owner,
                repo,
                prNumber,
                userId: repository.user.id
            }
        });
        await increamentReviewCount(repository.user.id, repository.id);

        return { success: true, message: "Review Queued" };

    } catch (error) {
        console.error(`Error in reviewPullRequest for ${owner}/${repo} #${prNumber}:`, error);

        // Attempt to log failure to DB only if it's not a connection error
        const errorMessage = error instanceof Error ? error.message : "Unknown Error";
        if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("Can't reach database")) {
            return { success: false, error: "Database connection timeout" };
        }

        try {
            const repository = await prisma.repository.findUnique({
                where: { owner_name: { owner, name: repo } }
            });

            if (repository) {
                await prisma.review.create({
                    data: {
                        repositoryId: repository.id,
                        prNumber,
                        prTitle: "Failed to queue review",
                        prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
                        review: `Error: ${errorMessage}`,
                        status: "failed"
                    }
                });
            }
        } catch (dbError) {
            console.error("Failed to log error to database:", dbError);
        }

        return { success: false, error: errorMessage };
    }
}