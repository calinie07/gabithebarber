import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Phone on same Wi‑Fi hits the Mac by LAN IP; Next 15 blocks /_next assets otherwise.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.100.132",
    "192.168.0.1",
    "192.168.1.1",
  ],
};

export default nextConfig;
