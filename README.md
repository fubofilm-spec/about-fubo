# about-fubo · 公开介绍与作品集

**FUBO 傅博 / SOMEWHILE 三不五时** 的公开层：个人简历、工作室简介、作品索引与 GitHub Pages 作品站。

- **Pages 站点**：https://fubofilm-spec.github.io/about-fubo/
- **简历 PDF**：[Releases](https://github.com/fubofilm-spec/about-fubo/releases/latest)
- **作品索引**：[content/works.md](content/works.md) · [content/works.json](content/works.json)
- **介绍手册**：[content/handbook.md](content/handbook.md)

## 仓库职责

| 内容 | 位置 | 来源 |
| --- | --- | --- |
| 作品站（Pages） | `docs/` | 由 `content/` 生成 |
| 作品元数据（160 条） | `content/works.json` / `works.md` | 飞书作品库 |
| 新客户介绍手册 | `content/handbook.md` | 飞书文档（公开段落） |
| 精选作品封面 | `docs/assets/covers/` | 飞书作品库三拼封面 |
| 简历 PDF | GitHub Releases | `FUBO RESUME 20251119.pdf` |
| 飞书 → GitHub 同步 | `scripts/sync_from_feishu.py` | lark-cli |

## 与私有仓的关系

- **`somewhile-studio`**（私有）仍是官网源码、能力定义与内容审阅的维护仓。
- 本仓是**公开发布层**：只放已授权公开的元数据、封面与话术，不放成片视频、内部备注、报价或客户私密素材。
- 同步脚本只导出白名单字段；新增公开字段前先核对 `CONTENT_AUDIT` 口径。

## 本地预览

```sh
cd docs
python3 -m http.server 5289
# 打开 http://127.0.0.1:5289/
```

## 同步飞书

```sh
export PATH="/opt/homebrew/bin:$PATH"
python3 scripts/sync_from_feishu.py
# 审阅 git diff 后手动 commit / push
```

## 维护约定

1. 飞书作品库是作品元数据的业务来源；本仓是其公开快照。
2. 成片视频不进 Git。大文件走 Releases。
3. 公开前核对：客户名称展示范围、署名、年份与「在线观看」链接是否仍有效。
4. 本仓设为 **public**；`somewhile-studio` 保持 **private**。
