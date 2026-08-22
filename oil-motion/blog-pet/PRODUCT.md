# 博客宠物动画 — 产品设计（SHU-818）

> Status: Accepted product decisions + Pilot scope  
> Linear: [SHU-818](https://linear.app/oh-bear/issue/SHU-818/博客宠物动画)  
> Skill: [oil-motion](https://github.com/oil-oil/oil-motion)

## 一句话定位

博客里的一只「会呼吸、会看你」的水墨小熊猫：平时安静 idle，读文章时跟着进度换姿态；不是养成游戏，也不是第三个世界入口。

## 已锁定决策

| 项 | 决策 |
|---|---|
| 主形象 | 水墨 **Panda（Airing）** — 与 comics / brand 一致 |
| 主场景 | **文章页**优先（`/posts/*`） |
| V1 | **注视桌宠（Mouse Look）** — pointer 驱动朝向 |
| V2 | **长文伴读（Scroll Companion）** — 滚动进度映射姿态 |
| V3（可选） | Mood 镜像 / Comics 特化；是否替换首页像素熊另议 |

## 与现有组件关系

| 组件 | 角色 | 关系 |
|---|---|---|
| IslandWidget | 首页左下 3D 入口 → `/world/` | 保留；新宠不做导航 |
| BonsaiWidget | 博客侧栏装饰 | 保留；新宠用 fixed 角标 |
| Lounge pets | `/nook` 养成 | 不复制玩法 |
| 首页像素熊 | 轻量彩蛋 | 短期并存；不双主桌宠 |

## V1 范围

**In：** 文章页左下角透明熊猫；idle；指针注视；可关；reduced-motion / 失败降级静态。

**Out：** 首页浮动入口、养成、默认聊天、音效任务、与像素熊并列为「主桌宠」。

## 成功标准

1. 桌面文章页 2s 内出现首帧  
2. 指针跟随无抽帧闪烁  
3. reduced-motion → 静态  
4. 关闭后刷新仍关  
5. 不挡正文 / 低于 modal  
6. Pilot：关键帧 + 短素材 + 真实页挂载

## Pilot 工件

见 [`oil-motion/blog-pet/`](../../../oil-motion/blog-pet/)。

运行时组件：`src/components/BlogPetWidget.astro`（挂在 `PostLayout`）。
