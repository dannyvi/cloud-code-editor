'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Globe, Zap, Shield, Settings, Plus, FolderOpen, Clock, Trash2 } from "lucide-react";
import { Project } from '@/lib/supabase';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    template: 'vanilla-js' as Project['template']
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      
      if (response.ok) {
        setShowCreateDialog(false);
        setNewProject({ name: '', description: '', template: 'vanilla-js' });
        loadProjects();
      }
    } catch (error) {
      console.error('创建项目失败:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadProjects();
      }
    } catch (error) {
      console.error('删除项目失败:', error);
    } finally {
      setDeleting(null);
    }
  };

  const getTemplateLabel = (template: string) => {
    const labels: Record<string, string> = {
      'vanilla-js': 'JavaScript',
      'react': 'React',
      'vue': 'Vue.js',
      'node': 'Node.js',
      'python': 'Python',
      'next': 'Next.js'
    };
    return labels[template] || template;
  };

  const getTemplateColor = (template: string) => {
    const colors: Record<string, string> = {
      'vanilla-js': 'bg-yellow-500',
      'react': 'bg-blue-500',
      'vue': 'bg-green-500',
      'node': 'bg-green-600',
      'python': 'bg-blue-600',
      'next': 'bg-black'
    };
    return colors[template] || 'bg-gray-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-semibold">
                  <Plus className="mr-2 h-5 w-5" />
                  创建新项目
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>创建新项目</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">项目名称</Label>
                    <Input
                      id="name"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入项目名称"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">项目描述</Label>
                    <Textarea
                      id="description"
                      value={newProject.description}
                      onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="输入项目描述（可选）"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template">模板</Label>
                    <Select value={newProject.template} onValueChange={(value) => setNewProject(prev => ({ ...prev, template: value as Project['template'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vanilla-js">Vanilla JavaScript</SelectItem>
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="vue">Vue.js</SelectItem>
                        <SelectItem value="node">Node.js</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="next">Next.js</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createProject} disabled={creating || !newProject.name.trim()} className="flex-1">
                      {creating ? '创建中...' : '创建项目'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      取消
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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

        {/* Projects Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">我的项目</h2>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-white/10 text-white hover:bg-white/20 border border-white/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              新建项目
            </Button>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-blue-100 mt-4">加载项目中...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-blue-200 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">还没有项目</h3>
                <p className="text-blue-100 mb-4">创建你的第一个项目开始编码吧</p>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-white text-blue-900 hover:bg-blue-50">
                  <Plus className="mr-2 h-4 w-4" />
                  创建项目
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-lg truncate">{project.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`${getTemplateColor(project.template)} text-white text-xs`}>
                            {getTemplateLabel(project.template)}
                          </Badge>
                          {project.is_public && (
                            <Badge variant="outline" className="text-blue-200 border-blue-200 text-xs">
                              公开
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(project.id)}
                        disabled={deleting === project.id}
                        className="text-red-300 hover:text-red-200 hover:bg-red-500/20 h-8 w-8 p-0"
                      >
                        {deleting === project.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-300"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {project.description && (
                      <CardDescription className="text-blue-100 text-sm line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-blue-200 text-sm mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>更新于 {formatDate(project.updated_at)}</span>
                    </div>
                    <Link href={`/editor?project=${project.id}`}>
                      <Button className="w-full bg-white text-blue-900 hover:bg-blue-50">
                        <Code className="mr-2 h-4 w-4" />
                        打开项目
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                <h3 className="text-white font-semibold mb-2">选择模板</h3>
                <p className="text-blue-100 text-sm">选择你熟悉的编程语言和框架</p>
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
