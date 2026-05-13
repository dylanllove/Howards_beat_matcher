import type { TimingPlan } from '../types';

export function sanitizeFileName(name: string): string {
  return name.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/\s+/g, ' ').replace(/\.+$/g, '').slice(0, 120) || 'Howards Beat Match';
}

type FileSystemWritableFileStream = WritableStream & { write(data: BlobPart): Promise<void>; close(): Promise<void> };
type FileSystemFileHandle = { createWritable(): Promise<FileSystemWritableFileStream> };
type FileSystemDirectoryHandle = { getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemDirectoryHandle>; getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle> };
declare global { interface Window { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>; } }

export async function exportProjectFolder(propertyName: string, mp3File: File, timingPlan: TimingPlan): Promise<void> {
  const safe = sanitizeFileName(propertyName);
  if (!window.showDirectoryPicker) throw new Error('Folder export requires Chrome or Edge with the File System Access API.');
  const root = await window.showDirectoryPicker();
  const folder = await root.getDirectoryHandle(safe, { create: true });
  const audioHandle = await folder.getFileHandle(`${safe}.mp3`, { create: true });
  const audioWriter = await audioHandle.createWritable();
  await audioWriter.write(mp3File); await audioWriter.close();
  const jsonHandle = await folder.getFileHandle(`${safe}.json`, { create: true });
  const jsonWriter = await jsonHandle.createWritable();
  await jsonWriter.write(new Blob([JSON.stringify(timingPlan, null, 2)], { type: 'application/json' })); await jsonWriter.close();
}
