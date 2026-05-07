# Phase 3.7 Plan

## Approach

1. 增加 `WORKTREE_ISOLATION_CONTRACT_VERSION` 和 isolation mode/peer/gate/decision 类型。
2. 实现 `inspectWorktreeIsolation` dry-run API：
   - 读取 `specs/<branch>/tasks.md` 和 capability registry。
   - 默认 capability 使用 `native-file-edit`。
   - 从 task metadata 读取 `affected_files` 和 `risk`。
   - 读取 peer task 的 `affected_files` 并规范化路径后检测 overlap。
3. 定义 isolation decision：
   - task/capability 缺失或 writable overlap => `blocked`。
   - database/security risk 或 external interaction => `manual`。
   - read-only capability => `none`。
   - local write / command execution => `required`。
4. 输出 dry-run gates：task_found、capability_declared、files_overlap、unsafe_concurrency、read_only。
5. Doctor 增加 `worktree_isolation_contract` PASS/FAIL 可见性。
6. CLI 增加：
   - `sdd isolation inspect <task_id> [--branch <branch>] [--capability <capability_id>] [--peer-task <task_id>] [--json]`
7. Tests 覆盖 writable overlap、read-only none、high-risk manual/required、doctor visibility、CLI visibility。
8. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Phase 3.7 只做 dry-run decision，不调用 git worktree。
- 不创建、不删除、不清理 worktree。
- 不执行 worker、adapter、task 或 validation command。
- 不修改 run state、events、artifacts、specs/tasks 或 sync-back state。
- `blocked` 和 `manual` 只作为下游 Phase 3.8+ 的输入 contract，不自动推进执行。
