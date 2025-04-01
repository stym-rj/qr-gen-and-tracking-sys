import { nanoid } from 'nanoid';
import qrcode from 'qrcode';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import dbConnect from '../../lib/dbConnect';
import QrLink from '../../models/QrLink';
import { s3Client } from '../../lib/s3Client';

export default async function handler(req, res) {
    const startTime = Date.now();
    console.log(`[${startTime}] /api/generate-qr START`);

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { targetUrl } = req.body;

    if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).json({ message: 'Target URL is required' });
    }

    // Validate URL format (basic example)
    try {
        console.log()
        new URL(targetUrl);
    } catch (_) {
        return res.status(400).json({ message: 'Invalid URL format' });
    }

    console.log(`[${Date.now() - startTime}ms] Connecting to DB...`);
    await dbConnect();
    console.log(`[${Date.now() - startTime}ms] DB Connected.`);

    const uniqueId = nanoid(8); // Generate a short unique ID (e.g., 8 characters)
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redirect/${uniqueId}`;
    const s3Bucket = process.env.S3_BUCKET_NAME;
    const s3Key = `qrcodes/${uniqueId}.png`;


    console.log("--- URL being encoded in QR Code ---"); // Add this log
    console.log(redirectUrl);                           // Add this log
    console.log("------------------------------------"); // Add this log


    try {
        // Generate QR code buffer
        console.log(`[${Date.now() - startTime}ms] Generating QR buffer for: ${redirectUrl}`);
        const qrCodeBuffer = await qrcode.toBuffer(redirectUrl, { errorCorrectionLevel: 'H' });
        console.log(`[${Date.now() - startTime}ms] QR Buffer generated.`);

        // Upload to S3
        const uploadParams = {
            Bucket: s3Bucket,
            Key: s3Key,
            Body: qrCodeBuffer,
            ContentType: 'image/png',
            // ACL: 'public-read', // Uncomment if your bucket policy doesn't grant public read
        };
        console.log(`[<span class="math-inline">\{Date\.now\(\) \- startTime\}ms\] Uploading to S3 \(</span>{s3Bucket}/${s3Key})...`);
        await s3Client.send(new PutObjectCommand(uploadParams));
        console.log(`[${Date.now() - startTime}ms] S3 Upload complete.`);

        const qrCodeS3Url = `https://<span class="math-inline">\{s3Bucket\}\.s3\.</span>{process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        // Note: Construct the S3 URL based on your region and bucket setup.
        // This format works for newer regions. Older ones might not need the region.
        // Or better: configure CloudFront in front of S3 for a custom domain and CDN benefits.

        // Save metadata to MongoDB
        const newQrLink = new QrLink({
            uniqueId,
            targetUrl,
            qrCodeS3Url,
        });
        console.log(`[${Date.now() - startTime}ms] Saving link metadata to DB...`);
        await newQrLink.save();
        console.log(`[${Date.now() - startTime}ms] DB Save complete.`);

        console.log(`[${Date.now() - startTime}ms] Sending success response.`);
        res.status(201).json({
            message: 'QR Code generated successfully',
            qrCodeUrl: qrCodeS3Url, // URL of the QR image itself
            redirectLink: redirectUrl // The link encoded IN the QR code
        });

    } catch (error) {
        const errorTime = Date.now() - startTime;
        console.error(`[${errorTime}ms] Error in generate-qr:`, error);

        console.error('Error generating QR code:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}