# Multi-stage Dockerfile for Clean-Start B2B CRM (Variant B: Executive Flow)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Clean initialization (no mock business data) + Variant B default
ARG VITE_CLEAN_START=true
ARG VITE_DEFAULT_VARIANT=B
ENV VITE_CLEAN_START=$VITE_CLEAN_START
ENV VITE_DEFAULT_VARIANT=$VITE_DEFAULT_VARIANT

RUN npm run build

# Serve static SPA via Nginx
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
