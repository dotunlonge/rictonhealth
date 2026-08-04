import { S3Client } from '@aws-sdk/client-s3';

// Suppress AWS SDK Node version warning for Node v20
process.env.AWS_SUPPRESS_NODE_VERSION_WARNING = '1';

const region = process.env.AWS_REGION || 'us-east-1';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'mock-access-key';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret-key';

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'ricton-avatars';
