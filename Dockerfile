# ImmoAssist – ein Container mit Backend (Claude API, Konten, Bezahlung) + App
FROM node:22-alpine

WORKDIR /app

# Abhängigkeiten zuerst (bessere Layer-Zwischenspeicherung)
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Quellcode
COPY server ./server
COPY makler-app ./makler-app

ENV PORT=8787
ENV NODE_ENV=production
EXPOSE 8787

WORKDIR /app/server
CMD ["node", "index.js"]
