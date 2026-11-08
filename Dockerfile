# Хүртээмжийн скан үйлчилгээ (hurteemj scanner)
#   docker build -t hurteemj-scanner .
#   docker run -p 8080:8080 -v hurteemj-data:/data hurteemj-scanner
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    HJ_DB=/data/hurteemj.db \
    PORT=8080

WORKDIR /app
COPY package.json package-lock.json ./
# devDependencies-д esbuild (build) ба playwright бий
RUN npm ci --include=dev && npx playwright install --with-deps chromium && rm -rf /root/.npm

COPY . .
RUN npm run build && mkdir -p /data && chown -R node:node /data

USER node
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
