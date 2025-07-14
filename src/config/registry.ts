/**
 * NPM镜像源配置
 * 用于优化依赖包下载速度
 */

export interface RegistryConfig {
  name: string;
  url: string;
  description: string;
  location: string;
}

export const NPM_REGISTRIES: RegistryConfig[] = [
  {
    name: 'taobao',
    url: 'https://registry.npmmirror.com/',
    description: '淘宝镜像源（推荐）',
    location: '中国'
  },
  {
    name: 'cnpm',
    url: 'https://r.cnpmjs.org/',
    description: 'CNPM镜像源',
    location: '中国'
  },
  {
    name: 'tencent',
    url: 'https://mirrors.cloud.tencent.com/npm/',
    description: '腾讯云镜像源',
    location: '中国'
  },
  {
    name: 'huawei',
    url: 'https://repo.huaweicloud.com/repository/npm/',
    description: '华为云镜像源',
    location: '中国'
  },
  {
    name: 'official',
    url: 'https://registry.npmjs.org/',
    description: 'NPM官方源',
    location: '美国'
  }
];

/**
 * 根据位置自动选择最佳镜像源
 */
export function getBestRegistry(location: 'china' | 'global' = 'china'): RegistryConfig {
  if (location === 'china') {
    return NPM_REGISTRIES[0]; // 淘宝镜像源
  }
  return NPM_REGISTRIES[4]; // 官方源
}

/**
 * 生成npm配置命令
 */
export function generateNpmConfigCommand(registry: RegistryConfig): string {
  return `npm config set registry ${registry.url}`;
}

/**
 * 生成内嵌到启动脚本的npm配置
 */
export function generateInlineNpmConfig(registryName: string = 'taobao'): string {
  const registry = NPM_REGISTRIES.find(r => r.name === registryName) || NPM_REGISTRIES[0];
  
  return `
    # 配置npm镜像源
    echo "🌐 设置npm镜像源: ${registry.description}"
    npm config set registry ${registry.url}
    npm config set cache /app/.npm-cache
    npm config set prefer-offline true
    npm config set audit false
    npm config set fund false
  `;
}