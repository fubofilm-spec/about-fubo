#!/usr/bin/env python3
"""飞书 → GitHub 公开层同步。

从飞书作品库与介绍手册导出公开元数据到 content/，并刷新 docs/ 的作品站数据。
不下载成片视频；封面仅精选作品的三拼封面。

用法：
  export PATH="/opt/homebrew/bin:$PATH"
  python3 scripts/sync_from_feishu.py
  python3 scripts/sync_from_feishu.py --skip-covers
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
DOCS = ROOT / "docs"
COVERS = DOCS / "assets" / "covers"

BASE_TOKEN = "FKSWbJKAqa6E0Fs7lEtca0nOnab"
TABLE_ID = "tbl3d1vOmLJBKfQt"
HANDBOOK_DOC = "https://voivnwq5c1.feishu.cn/docx/MD7RdnvKUoaUbNxqv0mcbCMInTf"

PUBLIC_FIELDS = [
    "作品",
    "客户／品牌",
    "项目类型",
    "年份",
    "成片时长",
    "看点",
    "技术手段",
    "应用场景",
    "行业",
    "作品方向",
    "在线观看",
    "精选顺序",
    "展示序列",
    "制作复杂度",
    "检索标签",
]
ATTACH_FIELDS = {"封面", "三拼封面", "设计封面", "案例截图"}


def run_lark(args: list[str]) -> str:
    cmd = ["lark-cli", *args]
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        sys.stderr.write(p.stderr)
        raise SystemExit(f"lark-cli failed: {' '.join(args[:6])}...")
    return p.stdout


def clean_cell(v):
    if v is None:
        return None
    if isinstance(v, list):
        if not v:
            return []
        if isinstance(v[0], dict) and "file_token" in v[0]:
            return [
                {"file_token": x.get("file_token"), "name": x.get("name"), "size": x.get("size")}
                for x in v
            ]
        return v
    return v


def export_handbook() -> None:
    raw = run_lark(
        [
            "docs",
            "+fetch",
            "--doc",
            HANDBOOK_DOC,
            "--as",
            "user",
            "--doc-format",
            "markdown",
        ]
    )
    d = json.loads(raw)

    def find_md(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("content", "markdown", "text") and isinstance(v, str) and len(v) > 200:
                    return v
                r = find_md(v)
                if r:
                    return r
        elif isinstance(o, list):
            for i in o:
                r = find_md(i)
                if r:
                    return r
        elif isinstance(o, str) and len(o) > 200:
            return o
        return None

    text = find_md(d)
    if not text:
        raise SystemExit("handbook content not found in fetch result")
    CONTENT.mkdir(parents=True, exist_ok=True)
    (CONTENT / "handbook.md").write_text(text, encoding="utf-8")
    print(f"handbook.md ← {len(text)} chars")


def export_works() -> list[dict]:
    raw = run_lark(
        [
            "base",
            "+record-list",
            "--base-token",
            BASE_TOKEN,
            "--table-id",
            TABLE_ID,
            "--limit",
            "200",
            "--format",
            "json",
            "--as",
            "user",
        ]
    )
    d = json.loads(raw)
    data = d["data"]
    fields = data["fields"]
    rows = data["data"]
    ids = data["record_id_list"]
    if len(rows) != len(ids):
        raise SystemExit(f"record/id mismatch: {len(rows)} vs {len(ids)}")

    out = []
    for rid, row in zip(ids, rows):
        rec = {"record_id": rid}
        fmap = dict(zip(fields, row))
        for k in PUBLIC_FIELDS:
            if k in fmap:
                rec[k] = clean_cell(fmap.get(k))
        for k in ATTACH_FIELDS:
            if k in fmap:
                rec[k] = clean_cell(fmap.get(k))
        out.append(rec)

    def sort_key(r):
        fo = r.get("精选顺序")
        year = r.get("年份") or ""
        try:
            y = int(str(year)[:4])
        except Exception:
            y = 0
        return (fo is None, fo if fo is not None else 9999, -y, r.get("作品") or "")

    out.sort(key=sort_key)
    CONTENT.mkdir(parents=True, exist_ok=True)
    (CONTENT / "works.json").write_text(
        json.dumps(
            {
                "source": f"feishu:{BASE_TOKEN}/{TABLE_ID}",
                "count": len(out),
                "works": out,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    def s(v):
        if isinstance(v, list):
            return "、".join(str(x) for x in v if x)
        return str(v) if v is not None else ""

    lines = [
        "# 作品索引 · Works Index",
        "",
        f"> 来源：飞书作品库（{len(out)} 条）· 仅元数据公开",
        "",
        "| 精选 | 作品 | 客户／品牌 | 年份 | 时长 | 项目类型 | 技术手段 | 行业 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for r in out:
        fo = r.get("精选顺序")
        star = ""
        if fo is not None:
            star = "★" if fo <= 20 else str(int(fo) if fo == int(fo) else fo)
        lines.append(
            "| {star} | {title} | {client} | {year} | {dur} | {typ} | {tech} | {ind} |".format(
                star=star,
                title=s(r.get("作品")),
                client=s(r.get("客户／品牌")),
                year=s(r.get("年份")),
                dur=s(r.get("成片时长")),
                typ=s(r.get("项目类型")),
                tech=s(r.get("技术手段")),
                ind=s(r.get("行业")),
            )
        )
    (CONTENT / "works.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"works.json/works.md ← {len(out)} records")
    return out


def sync_covers(works: list[dict]) -> None:
    COVERS.mkdir(parents=True, exist_ok=True)
    manifest = []
    for r in works:
        fo = r.get("精选顺序")
        if fo is None:
            continue
        order = int(fo) if fo == int(fo) else fo
        files = r.get("三拼封面") or []
        if not files:
            continue
        f = files[0]
        dest = COVERS / f"{order:02d}.jpg"
        if not dest.exists() or dest.stat().st_size < 1000:
            run_lark(
                [
                    "base",
                    "+record-download-attachment",
                    "--base-token",
                    BASE_TOKEN,
                    "--table-id",
                    TABLE_ID,
                    "--record-id",
                    r["record_id"],
                    "--file-token",
                    f["file_token"],
                    "--output",
                    str(dest),
                    "--as",
                    "user",
                    "--overwrite",
                ]
            )
            print(f"cover {dest.name}")
        def s(v):
            if isinstance(v, list):
                return "、".join(str(x) for x in v if x)
            return str(v) if v is not None else ""

        manifest.append(
            {
                "order": order,
                "title": r.get("作品"),
                "client": s(r.get("客户／品牌")),
                "year": s(r.get("年份")),
                "duration": s(r.get("成片时长")),
                "type": s(r.get("项目类型")),
                "tech": s(r.get("技术手段")),
                "industry": s(r.get("行业")),
                "cover": f"assets/covers/{order:02d}.jpg",
                "record_id": r["record_id"],
            }
        )
    manifest.sort(key=lambda x: x["order"])
    (COVERS / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"covers manifest ← {len(manifest)} items")


def rebuild_site_data(works: list[dict]) -> None:
    def s(v):
        if isinstance(v, list):
            return "、".join(str(x) for x in v if x)
        return str(v) if v is not None else ""

    feat = []
    for r in works:
        fo = r.get("精选顺序")
        if fo is None:
            continue
        order = int(fo) if fo == int(fo) else fo
        feat.append(
            {
                "order": order,
                "title": r.get("作品") or "",
                "client": s(r.get("客户／品牌")),
                "year": s(r.get("年份")),
                "duration": s(r.get("成片时长")),
                "type": s(r.get("项目类型")),
                "tech": s(r.get("技术手段")),
                "industry": s(r.get("行业")),
                "cover": f"assets/covers/{order:02d}.jpg",
            }
        )
    feat.sort(key=lambda x: x["order"])
    index = []
    for i, r in enumerate(works, 1):
        index.append(
            {
                "n": i,
                "title": r.get("作品") or "",
                "client": s(r.get("客户／品牌")),
                "year": s(r.get("年份")),
                "duration": s(r.get("成片时长")),
                "type": s(r.get("项目类型")),
                "tech": s(r.get("技术手段")),
                "featured": r.get("精选顺序") is not None,
            }
        )
    assets = DOCS / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    (assets / "works-data.js").write_text(
        "window.WORKS_DATA = "
        + json.dumps({"featured": feat, "index": index}, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )
    print(f"works-data.js ← featured {len(feat)} / index {len(index)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-covers", action="store_true")
    ap.add_argument("--skip-handbook", action="store_true")
    args = ap.parse_args()

    if not args.skip_handbook:
        export_handbook()
    works = export_works()
    if not args.skip_covers:
        sync_covers(works)
    rebuild_site_data(works)
    print("done. review git diff, then commit/push.")


if __name__ == "__main__":
    main()
