import { pineconeIndex } from "@/lib/pinecone";
import { embed } from "ai";
import { google } from "@ai-sdk/google";

export async function generateEmbedding(text: string) {
    const { embedding } = await embed({
        model: google.textEmbeddingModel("gemini-embedding-001"),
        value: text,
    });

    return embedding;
}

function splitTextIntoChunks(text: string, maxChunkSize: number = 2000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    
    while (i < text.length) {
        let end = i + maxChunkSize;
        
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            const lastSpace = text.lastIndexOf(' ', end);
            
            if (lastNewline > i + maxChunkSize / 2) {
                end = lastNewline + 1;
            } else if (lastSpace > i + maxChunkSize / 2) {
                end = lastSpace + 1;
            }
        }
        
        chunks.push(text.slice(i, end));
        i = end - overlap;
    }
    
    return chunks;
}

export async function indexCodebase(
    repoId: string,
    files: { path: string; content: string }[]
) {
    const vectors: any[] = [];
    let totalChunks = 0;
    let successfulChunks = 0;

    for (const file of files) {
        const content = `File: ${file.path}\n\n${file.content}`;
        const chunks = splitTextIntoChunks(content, 2000, 200);
        totalChunks += chunks.length;

        console.log(`[RAG] Indexed ${file.path}: Split into ${chunks.length} chunks.`);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const embedding = await generateEmbedding(chunk);

                vectors.push({
                    id: `${repoId}-${file.path.replace(/\//g, "_")}-chunk-${i}`,
                    values: embedding,
                    metadata: {
                        repoId,
                        path: file.path,
                        content: chunk,
                    },
                });
                successfulChunks++;
            } catch (e) {
                console.error(`Failed to embed chunk ${i} of ${file.path}:`, e);
            }
        }
    }
    if (vectors.length > 0) {
        const batchSize = 100;

        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await pineconeIndex.upsert({ records: batch });
        }
    }

    const result = {
        indexedFiles: files.length,
        totalChunks: totalChunks,
        indexedChunks: successfulChunks,
        failedChunks: totalChunks - successfulChunks,
    };

    console.log(`Indexing complete: ${result.indexedChunks}/${result.totalChunks} chunks indexed across ${result.indexedFiles} files`);
    return result;
}
export async function retrieveContext(
    query: string,
    repoId: string,
    topK: number = 5
) {
    const embedding = await generateEmbedding(query);

    const results = await pineconeIndex.query({
        vector: embedding,
        topK,
        includeMetadata: true,
        filter: {
            repoId: { $eq: repoId },
        },
    });

    return results.matches
        .map((match) => match.metadata?.content as string)
        .filter(Boolean);
}

