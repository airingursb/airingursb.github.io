# 首页小熊互动统计（Umami）

2026-09-15 起接入；之前的点击无法补算。只统计正式个人主页 `/`（ursb.me、www.ursb.me、airingursb.github.io），排除本地/Tailscale、预览和 Playbook 演示，以及带 scene/preview 查询参数的模拟。

## 事件

| 位置 | 有效曝光 | 首次参与 | 每次点击 |
| --- | --- | --- | --- |
| 顶部 | `bear-header-view` | `bear-header-engage` | `bear-header-click` |
| 页尾 | `bear-footer-view` | `bear-footer-engage` | `bear-footer-click` |

- 有效曝光：场景至少50%在视口中，前台连续停留1秒。离屏或切到后台会取消该次计时。真实点击本身也证明已看到，会先补曝光。
- 曝光、首次参与各按“本次文档访问 + 位置”记一次，滚回场景或重复点击不会增加它们；刷新/新访问重新统计。BFCache返回保留本次计数。
- 点击统计真实鼠标/触屏和键盘激活。代码`.click()`、自动日常、鸟啄玻璃、订阅成功后小熊挥手不算用户点击。
- 点击对象：`bear`、`mug`、`laptop`、`plant`、`lamp`、`book`、`letter`、`camera`、`curtain`、`bird`、`mailbox`。`engage.object`表示首次互动对象；`click.object`用于所有互动分布。
- 属性：`placement=header|footer`、`version=1`；互动另带`object`和`input=pointer|keyboard`。不新增身份标识，不上传邮箱、姓名、预览正文或其他内容。
- 有效点击即计数，不要求动画资源下载成功，也不把动画完成当成参与。点击预览内正文、关闭按钮和旁边订阅表单不算再次点击小熊场景。

## 在 Umami 查看

进入 https://analytics.ursb.me/，选择 ursb.me 站点和统计时间。

1. **互动人数/参与率**：建立两个 Funnel，窗口建议60分钟，步骤类型选 Event：
   - 顶部：`bear-header-view` → `bear-header-engage`
   - 页尾：`bear-footer-view` → `bear-footer-engage`
   漏斗用 Umami 的访客/会话识别口径和时序规则去重；它不是登录账号人数，跨设备、标识轮换不能保证同一自然人。
2. **点击热度**：在 Events 看`bear-header-click`和`bear-footer-click`的次数，按事件数据`object`查看点的是熊、杯子还是信箱。不要把这里的事件次数称作人数。
3. **单次页面访问参与率**：相同时间窗口内 `engage事件次数 / view事件次数` 可作访问级参考；跨时间窗口边界、网络丢失会有偏差，不能代替漏斗的去重人数。
4. 查看移动端/桌面差异时使用 Umami 原有设备维度。页尾分母使用页尾曝光，不能直接除以所有首页访客。

## 交付与可靠性

复用现有全站 Umami tracker。曝光/参与/点击按顺序发送，避免快速点击时漏斗倒序。tracker尚未加载时每个场景内存中最多暂存100条，加载后发送；不持久化、不另建cookie/指纹。保留 Umami 自身的屏蔽、排除自身访问等规则，脚本被拦截或网络失败时不影响场景，也无法保证统计完整。

浏览器验收拦截 Umami 收集请求，检查真实tracker产生的事件和字段，不将QA点击写入正式业务事件。必要的生产收集链路探针单独命名`analytics-verification`，不进入上述六类事件。

参考：
- [自定义事件与属性](https://docs.umami.is/docs/tracker-functions)
- [Funnel 的事件步骤和窗口](https://docs.umami.is/docs/funnel)
- [指标口径](https://docs.umami.is/docs/metric-definitions)
