FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expõe a porta que o Railway vai usar
EXPOSE 3000

CMD ["npx", "tsx", "server-standalone.ts"]
