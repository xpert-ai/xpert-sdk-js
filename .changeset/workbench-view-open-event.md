---
'@xpert-ai/xpert-sdk': patch
---

Add the `workbench.view.open` live event contract: `WORKBENCH_VIEW_OPEN_EVENT`, `WorkbenchViewOpenEvent`, `WorkbenchExtensionViewOpenRequest` and `parseWorkbenchViewOpenEvent` so Agents can request opening a Workbench extension view scoped to a project. Views declare `workbench.openMode: 'auto' | 'on-demand'`; the legacy `fixed` option is deprecated in favor of the manifest's `visible` field. Opening a view does not grant access; permissions still apply.
