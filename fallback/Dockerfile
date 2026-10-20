FROM node:22-alpine
WORKDIR /app
COPY server.mjs tv.html ./
ENV NODE_ENV=production PORT=3000 DB_PATH=/data/boards.db
VOLUME /data
EXPOSE 3000
CMD ["node", "--no-warnings", "server.mjs"]
