# Phase 4.3 NPM Publish Dry-run and Human Runbook

## 定位

Phase 4.3 进入 npm registry publish 流程的预演阶段：运行 `npm publish --dry-run`，并写清楚用户需要怎样登录、确认账号、处理 2FA/OTP 和批准真实 publish。

## 依赖

- Phase 4.2 Package Contents and Install Smoke completed。

## 范围

- 编写 npm account/login/publish runbook。
- 指导用户执行或授权 `npm login` / `npm whoami`。
- 运行 `npm publish --dry-run`。
- 记录 warnings 并分类为 blocking / acceptable。
- 明确 Phase 4.4 的真实 publish 前置条件。

## Human npm account runbook

1. 在 Claude Code prompt 中执行 `! npm login`，按 npm 提示在浏览器或终端完成登录；如果是首次创建账号，使用 `! npm adduser`。
2. 登录完成后返回本会话，继续由 Claude Code 运行 `npm whoami` 确认本机 npm auth 状态。
3. 确认输出账号是预期发布账号；如果账号不对，先执行 `! npm logout` 后重新登录。
4. 只有 `npm whoami` 成功且账号确认后，才运行 `npm publish --dry-run`。
5. 如果 dry-run 提示 OTP / 2FA，按 npm 提示提供一次性验证码；不要把长期 npm token 写入仓库、文档或对话。
6. dry-run 通过后仍不能自动真实 publish；Phase 4.4 必须再次确认 package name、version、account 和 exact publish command。

## Phase 4.4 security-key/browser authentication fast path

真实发布时如果 `npm publish --access public` 返回 `EOTP` 并提示打开 `https://www.npmjs.com/auth/cli/...`，这不是等待 Google Authenticator 扫码页。`npm publish` 只会触发当前账号已配置的 2FA 验证方式；Google Authenticator 二维码只会在 npm 账号安全设置里新增/重置 authenticator app 时出现。

后续发包按这个顺序处理：

1. 先确认 dry-run 干净：`npm publish --dry-run`。
2. 发布前确认账号：`npm whoami`，必须是预期 npm account。
3. 由用户在本机终端或 Claude Code prompt 中执行 `! npm publish --access public`，这样完整 browser auth URL 会显示在用户终端；对话/工具输出可能会脱敏成 `***`。
4. 打开终端里的完整 `https://www.npmjs.com/auth/cli/...` 链接。
5. 按 npm 页面完成 security key / passkey / Windows Hello / browser authentication。
6. 如果第一次 publish 命令已经退出，完成浏览器认证后重新执行 `npm publish --access public`。
7. 发布成功后立即验证：`npm view sdd-agent-platform name version --json`、`npm install -g sdd-agent-platform@latest`、`sdd --version`、clean repo `sdd init --ai claude-code && sdd status && sdd doctor`。

注意事项：

- 不要把 recovery code 当成 OTP；recovery code 不能转换成 Google Authenticator 的 6 位动态码。
- 不要把长期 npm token、`.npmrc` 或恢复码写入仓库、文档或对话。
- 如果已经成功发布过某个版本，后续发布必须先 bump version；npm 不允许覆盖同名同版本包。
- 如果需要 Google Authenticator 6 位码，必须先在 npm Account / Security / Two-Factor Authentication 里添加或重置 authenticator app。

## 非目标

- 不执行真实 `npm publish`。
- 不保存 npm token。
- 不创建 CI/CD publish workflow。
- 不切换 README / user-guide 默认安装路径。

## 交付物

- human publish runbook。
- `npm publish --dry-run` evidence。
- `phase4.3-spec.md`、`phase4.3-plan.md`、`phase4.3-tasks.md`、`phase4.3-validation.md`。

## 验收标准

- 用户能按 runbook 完成 npm login/whoami 检查。
- `npm publish --dry-run` 通过。
- warnings 被记录并分类。
- Phase 4.4 的真实 publish 命令和确认点明确。

## 下游引用

Phase 4.4 只有在 dry-run 通过且用户明确确认后才能执行真实 publish。