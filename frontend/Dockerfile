# Production stage
FROM nginx:alpine
# Expecting the 'build' folder to exist in the same directory as this Dockerfile
COPY build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
