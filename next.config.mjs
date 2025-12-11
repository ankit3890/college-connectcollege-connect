/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['better-sqlite3', 'pdf-parse', 'mongoose', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'puppeteer'],
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
