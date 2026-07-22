/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compress: true,          // comprime respuestas con gzip
  poweredByHeader: false,  // quita header X-Powered-By (seguridad)
  experimental: {
    optimizeCss: true,     // minifica CSS automáticamente
  },
};

export default nextConfig;
