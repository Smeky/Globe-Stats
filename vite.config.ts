import path from "node:path"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  base: isDev ? undefined : "/globe-stats/", // GitHub repo name, must be exact for GitHub Pages
  resolve: {
    alias: {
      "#src": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 3000,
  },
  plugins: [
    tanstackStart({ 
      customViteReactPlugin: true,
      target: isDev ? undefined : "github-pages",
      ...(isDev ? {} : {
        spa: {
          enabled: true,
          prerender: {
            enabled: true,
            outputPath: "/index.html"
          }
        }
      })
    }),
    tsConfigPaths(),
    viteReact(),
    tailwindcss(),
  ],
})
