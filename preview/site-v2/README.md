# 个人站 v2 结构预览

这是给审核看的本地结构预览，不是 [www.fubofilm.cn](https://www.fubofilm.cn)，也还没有与最新个人简介同步。

当前页面不是视觉定稿。此前一份排版建议来自网页版 GPT-6 Astra，不是用户指定的 Claude。Claude 的独立建议还没回来，栏目顺序、配色、栅格和字体角色都先保持原样，等那份全文再校正。这一步只做了可撤回的基础整理：创始人与团队约 30 人按已确认事实书写；来源差异和待补说明改放在 [NOTES.md](NOTES.md)；Noto Sans SC / Noto Serif SC 改为本目录自托管，许可在 `fonts/OFL-NotoSansSC.txt` 与 `fonts/OFL-NotoSerifSC.txt`。页面不再请求 Google Fonts。

预览放在 `preview/site-v2/`，不改 `docs/`。GitHub Pages 只从 `main` 的 `/docs` 发布，因此这些文件即使日后被合进 `main`，也不会替换现在的 GitHub Pages 页面，更不会改到 fubofilm.cn。本轮不合并、不推 `main`、不加发布流程。

## 怎么打开

在仓库根目录：

```sh
python3 -m http.server 5291
```

浏览器打开 <http://127.0.0.1:5291/preview/site-v2/>。

从仓库根目录启动时，「完整案例」里的作品索引和手册链接才能打开。只在 `preview/site-v2/` 里起服务，页面和图片仍可看，仓库里的 Markdown 链接会找不到。

## 这一版有什么、没有什么

页面按对外栏目搭了结构：介绍、商业作品、VGENT、摄影指导、FOPTIC、故乡、自媒体、完整案例、档案、联系。

文案和图片只来自两处已经公开的材料：

- 2026-11-07 抓取的 www.fubofilm.cn 公开页面和公开图片
- 本仓 2026-10-28 导出的作品索引、精选封面和手册里已标明可直接使用的段落

没有生成图片，没有把飞书未接入的最新简介写成已完成内容。带「待对齐」的位置是空着等资料，不是定稿。

数字不要当成最新成绩。本仓快照是 160 条；其中技术字段「实拍」103 次、「AIGC生成」47 次。简历口径是 120 余支实拍、35 部 AIGC。两套数不一致，页面上都不写成最新成绩。

## 图片来源

`media/covers/` 是本仓 `docs/assets/covers/` 的副本，对应精选封面。

`media/from-fubofilm/` 是现网公开图，抓取日期 2026-11-07，原地址在 `https://www.fubofilm.cn/assets/` 下的同名路径。没有收入现网履历页图、空军招飞画面、追觅海报。肖像原文件底部有一条白边，预览里裁掉了这条白边，没有重绘画面。
