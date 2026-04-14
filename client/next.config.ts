import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hive-s3-images.s3.ap-southeast-2.amazonaws.com",
        port: "",
        pathname: "/properties/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.ap-southeast-2.amazonaws.com",
        port: "",
        pathname: "/properties/**",
      },
      // Keep example.com for placeholder images (optional)
      {
        protocol: "https",
        hostname: "example.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;