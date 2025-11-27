# Dockerfile para APIgateway (Node.js)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "apiGateway.js"]
