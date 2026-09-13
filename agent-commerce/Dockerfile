FROM node:22-alpine

WORKDIR /app

COPY agent-commerce/package.json ./agent-commerce/package.json
WORKDIR /app/agent-commerce
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

WORKDIR /app
COPY core ./core
COPY agent-commerce ./agent-commerce

WORKDIR /app/agent-commerce
ENV NODE_ENV=production
ENV PORT=4021
EXPOSE 4021

CMD ["node", "server.mjs"]
