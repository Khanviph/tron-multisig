/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 启用静态导出
  images: {
    unoptimized: true,
  },
  basePath: '/tron-multisig',
  assetPrefix: '/tron-multisig',
}

module.exports = nextConfig
