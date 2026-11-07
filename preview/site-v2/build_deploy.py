#!/usr/bin/env python3
"""Build deploy-resume.zip for resume.fubofilm.cn. Does not upload or change DNS."""
from __future__ import annotations

import hashlib
import re
import shutil
import tarfile
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
STAGE = Path("/tmp/resume-pack")
SITE = STAGE / "site"
STORE = Path("/cursor/stores/self")

README = """# resume.fubofilm.cn 静态站

把 `site/` 作为 **resume.fubofilm.cn** 的网站根目录。不要把 `site/` 覆盖到 fubofilm.cn 或 www.fubofilm.cn 现在的目录，也不要改这两个主域名现有的 Nginx / OpenResty 配置。

## 目录

- `site/index.html`：入口
- `site/` 里的字体、图片、作品索引都在本目录内，不依赖仓库其他路径
- 本说明在站点外面，不要把它放进网站根目录

## 运行依赖

这是纯静态文件。不需要数据库、Node 或 Python。用现有的 Nginx 或 OpenResty 指到一个新目录即可。

页面会打开这些外链：现网档案、GitHub 上的介绍手册、简历 PDF、B 站、VGENT。作品索引是站内的 `archive/works.md`。

## 缓存、压缩、HTTPS

建议只给这个新站点加一段配置，路径和证书等环境确认后再填。下面是示例，不是要合并进主站的现成配置。

```nginx
server {
    listen 443 ssl;
    server_name resume.fubofilm.cn;

    # 换成这台机器上的实际目录，不要写成 www 主站的 root
    root /PATH/TO/site;
    index index.html;

    ssl_certificate     /PATH/TO/resume.fullchain.pem;
    ssl_certificate_key /PATH/TO/resume.privkey.pem;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(css|js|woff2|webp|md)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

`site/` 里的 html、css、js 旁边附有同名 `.gz` 和 `.br`。只有这台机器已经安装并允许 `gzip_static` 或 `brotli_static` 时，才在这个 server 里打开它们。没有这些模块就保持现状，用普通的 `gzip on` 也可以。不要为了这个子域名去改主站的压缩配置。

HTTP 可以单独 301 到 HTTPS，同样只写 `server_name resume.fubofilm.cn`。

## 回滚

1. 上线前如果这台机器上已经有 resume 的旧目录，先改名为带日期的备份。没有旧目录就不用做这一步。
2. 确认 `nginx -t` 通过后再 reload。
3. 出问题时，把这个 server 的 `root` 指回备份目录，再执行一次 `nginx -t` 和 reload。
4. 不要改 www 或裸域名 fubofilm.cn 的 server，也不要改它们的 DNS。

## 已知情况

- 最新个人简介还没有同步。页面顶部有一行说明，这不是完整定稿。
- 桌面浏览器的手机视口检查过。没有在 iPhone 或 Android 真机上测过。
"""


def minify_css(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*([{}:;,])\s*", r"\1", text)
    return text.strip()


def minify_html(text: str) -> str:
    return re.sub(r">\s*\n\s*<", "><", text).strip() + "\n"


def export_webp(src: Path, dest_dir: Path, stem: str) -> list[tuple[int, str]]:
    im = Image.open(src)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    widths = []
    if im.width > 1000:
        widths.append(960)
    widths.append(min(im.width, 1600))
    made = []
    seen = set()
    for w in widths:
        if w in seen:
            continue
        seen.add(w)
        frame = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.Resampling.LANCZOS)
        name = f"{stem}-{w}.webp"
        path = dest_dir / name
        frame.save(path, "WEBP", quality=82, method=6)
        made.append((w, name))
    return made


def picture(attrs: str, media_map: dict) -> str:
    src_m = re.search(r'src="([^"]+)"', attrs)
    if not src_m or src_m.group(1) not in media_map:
        return "<img " + attrs + ">"
    items = media_map[src_m.group(1)]
    srcset = ", ".join(f"media/opt/{name} {w}w" for w, name in items)
    fallback = items[-1][1]
    new_attrs = re.sub(r'src="[^"]+"', f'src="media/opt/{fallback}"', attrs, count=1)
    return (
        f'<picture><source type="image/webp" srcset="{srcset}" sizes="(max-width: 899px) 100vw, 540px">'
        f"<img {new_attrs}></picture>"
    )


def precompress(path: Path) -> None:
    import gzip
    data = path.read_bytes()
    with gzip.open(path.with_suffix(path.suffix + ".gz"), "wb", compresslevel=9) as fh:
        fh.write(data)
    try:
        import brotli
    except ImportError:
        return
    path.with_suffix(path.suffix + ".br").write_bytes(brotli.compress(data, quality=11))


def main() -> None:
    if STAGE.exists():
        shutil.rmtree(STAGE)
    SITE.mkdir(parents=True)
    html = (ROOT / "index.html").read_text()
    opt = SITE / "media" / "opt"
    opt.mkdir(parents=True)
    media_map = {}
    for rel in dict.fromkeys(re.findall(r'src="(media/[^"]+)"', html)):
        media_map[rel] = export_webp(ROOT / rel, opt, Path(rel).stem)
    html = re.sub(r"<img\s+([^>]+)>", lambda m: picture(m.group(1), media_map), html)
    html = html.replace(
        '<link rel="stylesheet" href="fonts/fonts.css">\n<link rel="stylesheet" href="fonts/extra.css">',
        '<link rel="stylesheet" href="fonts/fonts.css">',
    )
    (SITE / "index.html").write_text(minify_html(html))
    (SITE / "site.css").write_text(minify_css((ROOT / "site.css").read_text()))
    (SITE / "site.js").write_text((ROOT / "site.js").read_text())
    font_dir = SITE / "fonts" / "files"
    font_dir.mkdir(parents=True)
    css = minify_css((ROOT / "fonts" / "fonts.css").read_text() + "\n" + (ROOT / "fonts" / "extra.css").read_text())
    (SITE / "fonts" / "fonts.css").write_text(css)
    for name in (
        "noto-sans-sc-400-subset.woff2",
        "noto-sans-sc-500-subset.woff2",
        "noto-serif-sc-600-subset.woff2",
        "inter-tight-latin-400-normal.woff2",
        "inter-tight-latin-500-normal.woff2",
        "jetbrains-mono-latin-400-normal.woff2",
    ):
        shutil.copy2(ROOT / "fonts" / "files" / name, font_dir / name)
    for lic in (ROOT / "fonts").glob("OFL-*.txt"):
        shutil.copy2(lic, SITE / "fonts" / lic.name)
    (SITE / "archive").mkdir()
    shutil.copy2(ROOT / "archive" / "works.md", SITE / "archive" / "works.md")
    for path in (SITE / "index.html", SITE / "site.css", SITE / "site.js", SITE / "fonts" / "fonts.css"):
        precompress(path)
    (STAGE / "README.md").write_text(README)
    STORE.mkdir(parents=True, exist_ok=True)
    zip_path = STORE / "deploy-resume.zip"
    tar_path = STORE / "deploy-resume.tar.gz"
    if zip_path.exists():
        zip_path.unlink()
    if tar_path.exists():
        tar_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(STAGE.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(STAGE).as_posix())
    with tarfile.open(tar_path, "w:gz") as tf:
        tf.add(STAGE / "README.md", arcname="README.md")
        tf.add(SITE, arcname="site")
    for path in (zip_path, tar_path):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        print(f"{path.name} {path.stat().st_size} sha256 {digest}")
    site_bytes = sum(p.stat().st_size for p in SITE.rglob("*") if p.is_file())
    print("site bytes", site_bytes, "files", sum(1 for p in SITE.rglob("*") if p.is_file()))


if __name__ == "__main__":
    main()
