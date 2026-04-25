# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─── Stage 2: development ────────────────────────────────────────────────────
# Vite dev server with HMR; source is mounted as a volume at runtime
FROM node:20-alpine AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─── Stage 3: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build args injected at build time so Vite can embed them
ARG VITE_API_URL
ARG VITE_API_PUBLIC_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_PUBLIC_URL=$VITE_API_PUBLIC_URL
RUN npm run build

# ─── Stage 4: production ─────────────────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx config is provided via the compose volume mount
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
