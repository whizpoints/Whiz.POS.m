import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
dotenv.config();
const s3Client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    }
});
export const uploadAsset = async (fileBuffer, fileName, mimeType) => {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName)
        throw new Error("S3_BUCKET_NAME is not set");
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: "public-read"
    });
    await s3Client.send(command);
    const publicUrl = process.env.S3_PUBLIC_URL;
    if (!publicUrl)
        throw new Error("S3_PUBLIC_URL is not set");
    // Ensure no hardcoded .r2.dev domains! Prefix with our custom domain.
    return `${publicUrl.replace(/\/$/, '')}/${fileName}`;
};
