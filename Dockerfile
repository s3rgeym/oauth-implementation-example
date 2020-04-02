FROM node:alpine as build
WORKDIR /app
COPY . .
RUN npm i && npm run build
EXPOSE 80
CMD ["npm", "run", "serve"]
