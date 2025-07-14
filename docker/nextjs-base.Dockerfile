# Next.js 预构建基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置npm镜像源和缓存优化
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm config set audit false && \
    npm config set fund false

# 预安装常用依赖
COPY docker/package-base.json package.json
RUN npm install --no-audit --no-fund && \
    npm cache clean --force

# 创建缓存目录
RUN mkdir -p /app/.npm-cache

# 设置npm缓存目录
ENV NPM_CONFIG_CACHE=/app/.npm-cache

# 暴露端口
EXPOSE 3000

CMD ["npm", "run", "dev"]