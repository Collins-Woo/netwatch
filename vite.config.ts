import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production' || process.env.BUILD_MODE === 'prod'

  return {
    plugins: [
      react(),
      sourceIdentifierPlugin({
        enabled: !isProd,
        attributePrefix: 'data-matrix',
        includeProps: true,
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Base path configuration - adjust for subdirectory deployment
    base: command === 'build' ? './' : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProd,
    },
  }
})
