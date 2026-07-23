/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Middleware buffers request bodies (default 10MB). Kept high for any
  // non-upload JSON payloads; file bytes go direct to Supabase Storage
  // (required on Vercel — serverless functions cap bodies at 4.5MB).
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
