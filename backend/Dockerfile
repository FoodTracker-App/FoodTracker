FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
