import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

if (!region || !credentials.accessKeyId || !credentials.secretAccessKey) {
    console.warn("AWS S3 credentials or region not fully configured. S3 operations might fail.");
    // Decide if you want to throw an error or allow the app to run with limited functionality
}

const s3Client = new S3Client({
    region: region,
    credentials: credentials,
});

export { s3Client };