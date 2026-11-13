FROM oven/bun:1.4
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
USER bun
CMD ["bun", "server.ts"]
