FROM node:18-alpine

WORKDIR /app

COPY src/ .

CMD ["node", "main.js"]
