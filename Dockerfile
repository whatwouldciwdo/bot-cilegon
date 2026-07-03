# Backend bot (Node.js)
FROM node:20-alpine

WORKDIR /app

# Install dependencies dulu (cache layer)
COPY package.json ./
RUN npm install --omit=dev

# Salin sumber
COPY src ./src
# Salin dashboard/static assets
COPY public ./public
# Salin template Excel (Form Nominasi LNG)
COPY templates ./templates

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
