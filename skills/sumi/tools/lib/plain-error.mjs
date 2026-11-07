/* Turn a technical failure into words a beginner, and their assistant, can act on. */
export function plainError(error) {
  const text = String(error?.message ?? error), path = error?.path || '';
  if (error?.code === 'ENOENT' && /ff(mpeg|probe)/.test(`${path} ${text}`)) return 'FFmpeg is missing. It is free. Ask the user before installing it from https://ffmpeg.org/download.html, then try again.';
  if (error?.code === 'ENOENT') return `Cannot find ${path || 'that file'}. Check the name, and that this is running in the film's folder.`;
  if (error?.code === 'EPERM' || error?.code === 'EACCES') return `This app is not allowed to use ${path || 'that file'}. Ask the user for permission to use this folder. In Codex, that means Full access.`;
  if (error instanceof SyntaxError) return `A plan file is not written correctly, so it cannot be read: ${text}`;
  if (/InvalidStateError|could not be decoded|Unsupported image/i.test(text)) return 'That file cannot be read as a picture. Check that it is a real PNG or JPG, and not empty.';
  return text;
}
