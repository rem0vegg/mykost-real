FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN mkdir -p /app/uploads

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
