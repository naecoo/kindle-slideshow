# kindle-slideshow

> 越狱 Kindle 的屏保图片全轮播应用 —— 类似阅读器的体验。

[English](README.md) | **简体中文**

把你在 `/mnt/us/screensaver/` 里的屏保图片（`bg_ss00.png` …）全屏轮播展示。
屏幕默认只显示图片、没有任何控件：**轻触右上角直接打开全屏设置页**
（KOReader 式，非弹窗）——调整轮播间隔、随机播放、图片文件夹、语言，或退出应用。
图片切换采用双缓冲，墨水屏换页不出现白帧。

## 功能

- 全屏轮播屏保图片，自动按设定间隔切换；**无系统边栏，纯图片铺满全屏**
- **轻触右上角**直接打开**全屏设置页**（KOReader 式，无弹窗）
- 左右滑动 / 轻点切换上一张、下一张（阅读器式翻页）；切换双缓冲，无白帧
- 设置页包含：
  - **轮播间隔**：1–600 秒，带 5 / 10 / 15 / 30 / 60 秒快捷档
  - **随机播放**：打乱图片顺序
  - **图片文件夹**：默认 `/mnt/us/screensaver/`，可指向其它目录
  - **退出应用**
- 设置自动保存（localStorage），下次打开仍然生效
- 界面支持**英文（默认）**与简体中文 —— 设置页内切换

## 兼容性

- 越狱 Kindle（SpiderCat / WinterBreak 等现代越狱均可），实测目标：
  Kindle Paperwhite 4，固件 5.17.x
- 应用本身是一个 **Mesquite WAF**（HTML/CSS/JS 网页应用），无网络依赖、
  无第三方库
- 桌面浏览器也可直接打开调试（见「本地开发」）

## 仓库结构

```
kindle-slideshow/
├── app/                    # Mesquite 应用本体
│   ├── config.xml          # widget 清单：权限、手势、消息白名单
│   ├── index.html          # 界面结构
│   ├── main.css            # 墨水屏黑白样式
│   └── main.js             # 轮播 / 设置 / 手势 / Kindle 桥接
├── install_slideshow.sh    # 安装脚本（首装 / 更新用）
├── slideshow.sh            # 启动脚本（日常使用）
├── LICENSE                 # MIT
└── README.md
```

## 安装

前提：设备已越狱，且能像运行 scriptlet 一样运行 `documents` 里的 `.sh` 文件
（SpiderCat 等现代越狱自带）。

1. USB 连接 Kindle，把仓库中的 `app/` 整个文件夹拷入 Kindle，并重命名为 `slideshow`：

   ```
   <repo>/app/  →  /mnt/us/documents/slideshow/
   ```

2. 把两个脚本拷入：

   ```
   <repo>/install_slideshow.sh  →  /mnt/us/documents/install_slideshow.sh
   <repo>/slideshow.sh          →  /mnt/us/documents/slideshow.sh
   ```

3. 弹出 USB，在 Kindle 图书馆里点开 **Install Slideshow**（仅首装 / 更新时用）。
   屏幕提示 `Slideshow installed. Launching...` 后应用会自动打开。

之后日常启动：直接点图书馆里的 **Slideshow**（只启动、不重装）。
也可用命令行：

```sh
lipc-set-prop com.lab126.appmgrd start app://org.slideshow.kindle
```

## 使用

屏幕默认**只显示图片**，没有任何控件：

| 操作 | 效果 |
| --- | --- |
| 轻触**右上角** | 打开 / 关闭全屏设置页 |
| 轻触其它位置 | 下一张 |
| 左右滑动 | 下一张 / 上一张 |
| 键盘 ← → | 上一张 / 下一张（外接键盘） |
| Esc | 关闭设置页 |
| 设置页里的**退出应用** | 退出（失灵时可下拉顶部系统菜单返回） |

默认每 10 秒自动切换一张，图片来自 `/mnt/us/screensaver/`
—— 与系统屏保共用同一个文件夹，增删图片两边同时生效。

## 本地开发

应用不依赖 Kindle 也能跑。在仓库的**上级目录**起一个静态服务器：

```sh
cd /path/to/parent   # 含 kindle-slideshow/ 与图片目录的那层
python3 -m http.server 8000
```

然后打开
`http://127.0.0.1:8000/kindle-slideshow/app/index.html?dir=/screensaver/`，
其中 `?dir=` 指向一个含 PNG/JPG 的目录（相对或绝对路径均可），即可在浏览器里
验证轮播、设置面板和快捷键。所有 `window.kindle` 调用都有保护，浏览器里会静默跳过。

## 工作原理

- 应用是标准 Mesquite WAF：`install_slideshow.sh` 把 `app/` 拷到
  `/var/local/mesquite/slideshow/`，向 `/var/local/appreg.db` 注册
  `org.slideshow.kindle`，再通过 `com.lab126.appmgrd` 的 LIPC `start` 属性启动。
- 图片列表通过隐藏 iframe 读取目录列表并解析 `<a href>` 获得
  （Kindle 的 `file://` 目录列表会包一层 `<pre>`，解析时已兼容）。
- 图片切换采用双缓冲：后层加载完成后再原子换层，全程无白帧
- 退出走 `kindle.messaging` → `com.lab126.appmgrd` 的 `stop` 消息；
  失灵时下拉顶部系统菜单返回主页
- 手势走 `kindle.gestures.onswipe` / `ontap`，并叠加 DOM 点击兜底。

## 待真机验证

以下行为在无设备环境下实现，首次真机运行时请确认：

1. **设置页里的「退出应用」**：通过
   `sendStringMessage("com.lab126.appmgrd", "stop", …)` 尝试退出。
   若固件不响应此消息，可下拉屏幕顶部系统菜单返回主页（保底方案）。
2. **`internetRequired=no`**：若应用无法启动，把 `config.xml` 中该项改回
   `yes` 再装一次。
3. **`ontap` 事件坐标**：若真机上手势与 DOM 点击同时触发，观察是否有
   「设置闪开闪关」；如有，把 `main.js` 中 `handleTap` 的防抖窗口调大即可。
4. **左右滑动方向**：不同固件的 direction 取值大小写不一，代码做了不区分大小写的
   包含匹配，若方向反了请反馈。

## 卸载

在 Kindle 上执行（或通过 SSH）：

```sh
lipc-set-prop com.lab126.appmgrd stop app://org.slideshow.kindle
rm -rf /var/local/mesquite/slideshow
sqlite3 /var/local/appreg.db "DELETE FROM properties WHERE handlerId='org.slideshow.kindle';"
sqlite3 /var/local/appreg.db "DELETE FROM handlerIds WHERE handlerId='org.slideshow.kindle';"
```

再从 `documents` 中删除 `slideshow/` 与 `install_slideshow.sh` 即可。

## License

[MIT](LICENSE)
