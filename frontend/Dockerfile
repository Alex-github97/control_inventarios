FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
# La consola del operador se compila aparte y se sirve solo en el host admin.*
COPY --from=build /app/dist-admin /usr/share/nginx/html-admin
# La pagina publica: estatica, sin compilar, servida por host.
COPY --from=build /app/landing /usr/share/nginx/html-landing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
