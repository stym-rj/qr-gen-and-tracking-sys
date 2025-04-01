import { nanoid } from 'nanoid';
import qrcode from 'qrcode';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import dbConnect from '../../lib/dbConnect';
import QrLink from '../../models/QrLink';
import { s3Client } from '../../lib/s3Client';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { targetUrl } = req.body;

    if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).json({ message: 'Target URL is required' });
    }

    // Validate URL format (basic example)
    try {
        new URL(targetUrl);
    } catch (_) {
        return res.status(400).json({ message: 'Invalid URL format' });
    }

    await dbConnect();

    const uniqueId = nanoid(8); // Generate a short unique ID (e.g., 8 characters)
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redirect/${uniqueId}`;
    const s3Bucket = process.env.S3_BUCKET_NAME;
    const s3Key = `qrcodes/${uniqueId}.png`;


    console.log("--- URL being encoded in QR Code ---"); // Add this log
    console.log(redirectUrl);                           // Add this log
    console.log("------------------------------------"); // Add this log


    try {
        // Generate QR code buffer
        const qrCodeBuffer = await qrcode.toBuffer(redirectUrl, { errorCorrectionLevel: 'H' });

        // Upload to S3
        const uploadParams = {
            Bucket: s3Bucket,
            Key: s3Key,
            Body: qrCodeBuffer,
            ContentType: 'image/png',
            // ACL: 'public-read', // Uncomment if your bucket policy doesn't grant public read
        };
        await s3Client.send(new PutObjectCommand(uploadParams));

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
        await newQrLink.save();

        res.status(201).json({
            message: 'QR Code generated successfully',
            qrCodeUrl: qrCodeS3Url, // URL of the QR image itself
            redirectLink: redirectUrl // The link encoded IN the QR code
        });

    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}