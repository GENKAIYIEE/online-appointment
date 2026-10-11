import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      // Default is 1MB. Registration IDs and family Proof-of-Relationship
      // documents are sent as compressed base64 images through Server Actions.
      // Kept below Vercel's 4.5MB serverless request body cap.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
