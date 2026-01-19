import { NextResponse } from 'next/server';
import * as fal from '@fal-ai/serverless-client';

// POST /api/ai/remove-background
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image') as File;

        if (!imageFile) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Convert File to Blob/Buffer for Fal
        // The fal client can handle file inputs if we use the storage upload feature 
        // OR we can just pass the file if it supports it.
        // For server-side usage, we often just want to generate a signed URL or proxy the execution.

        // HOWEVER, @fal-ai/serverless-client is designed more for client-side with a proxy.
        // Let's use the 'fal.subscribe' pattern but we need to configure the proxy.
        // Actually, for a simple server-side call:

        // 1. We should configure FAL_KEY from env.
        if (!process.env.FAL_KEY) {
            return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 });
        }

        fal.config({
            credentials: process.env.FAL_KEY,
        });

        // 2. Upload file to Fal storage (temp) -> Run model
        // The library provides 'run' which handles upload if we pass a file object?
        // On server side (Node), File object might be different. 
        // Let's turn it into a blob or use the storage upload explicitly if needed.

        // Let's try passing the file directly to `fal.subscribe`.
        // The id for background removal is 'fal-ai/image-background-remove' or 'fal-ai/remove-background'. 
        // Checking common model IDs: 'fal-ai/image-background-remove' is standard.

        const result: any = await fal.subscribe('fal-ai/imageutils/rembg', {
            input: {
                image_url: imageFile, // The client handles upload if this is a File/Blob
            },
            logs: true,
            onQueueUpdate: (update: any) => {
                if (update.status === 'IN_PROGRESS') {
                    // console.log(update.logs.map((log) => log.message));
                }
            },
        });

        // Result usually contains 'image' { url: ..., ... }
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Fal AI Error:', error);
        return NextResponse.json(
            { error: error.message || 'Background removal failed' },
            { status: 500 }
        );
    }
}
