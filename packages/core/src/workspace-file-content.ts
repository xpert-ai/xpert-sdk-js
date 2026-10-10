/** Validate a server-issued grant before authentication is attached to its runtime read route. */
export function workspaceFileContentRoute(grantUrl: string, contentBase: URL): string {
  const target = new URL(grantUrl, contentBase);
  const prefix = `${contentBase.pathname}content/`;
  if (
    target.origin !== contentBase.origin ||
    !target.pathname.startsWith(prefix) ||
    target.username ||
    target.password ||
    target.search ||
    target.hash
  ) {
    throw new Error('Invalid workspace file access URL.');
  }
  const parts = target.pathname.slice(prefix.length).split('/');
  if (
    parts.length !== 3 ||
    parts.some((part) => {
      const decoded = decodeURIComponent(part);
      return (
        !decoded || decoded === '.' || decoded === '..' || /[/\\\u0000-\u001f\u007f]/.test(decoded)
      );
    })
  ) {
    throw new Error('Invalid workspace file access URL.');
  }
  const [sessionId, grantId, fileName] = parts;
  return `/workspace-files/view-sessions/${sessionId}/grants/${grantId}/content/${fileName}`;
}
