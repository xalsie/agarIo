# Build stage
FROM node:24 AS build
WORKDIR /app
COPY . .
RUN npm i -g bun && bun install && bun run build

# Nginx stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
