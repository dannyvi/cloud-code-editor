import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Play, Globe, Zap, Shield, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
              <Code className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">
            Cloud Code Editor
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            在线代码编辑器，支持实时预览和容器化运行环境。
            像 CodeSandbox 一样简单，但完全由你控制。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/editor">
              <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-semibold">
                <Play className="mr-2 h-5 w-5" />
                开始编码
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Globe className="mr-2 h-5 w-5" />
              查看文档
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Zap className="mr-2 h-5 w-5" />
                实时预览
              </CardTitle>
              <CardDescription className="text-blue-100">
                代码修改即时反映在预览窗口中
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Shield className="mr-2 h-5 w-5" />
                容器化运行
              </CardTitle>
              <CardDescription className="text-blue-100">
                基于 Kubernetes 的安全隔离环境
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Settings className="mr-2 h-5 w-5" />
                多语言支持
              </CardTitle>
              <CardDescription className="text-blue-100">
                支持 JavaScript、Python、Java 等多种语言
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Start */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white text-center">快速开始</CardTitle>
            <CardDescription className="text-blue-100 text-center">
              三步开始你的编程之旅
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="text-white font-semibold mb-2">选择语言</h3>
                <p className="text-blue-100 text-sm">选择你熟悉的编程语言</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="text-white font-semibold mb-2">编写代码</h3>
                <p className="text-blue-100 text-sm">在强大的编辑器中编写代码</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="text-white font-semibold mb-2">实时预览</h3>
                <p className="text-blue-100 text-sm">立即看到运行结果</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-white/20">
          <p className="text-blue-100">
            使用 Next.js、Monaco Editor 和 Kubernetes 构建
          </p>
        </footer>
      </div>
    </div>
  );
}
