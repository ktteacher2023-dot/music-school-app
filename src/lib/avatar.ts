import { supabase } from './supabase';
import { patchProfile } from './profile';

/** Center-crops an image file to a 200×200 JPEG blob */
export function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objUrl); reject(new Error('no canvas context')); return; }
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 200, 200);
      URL.revokeObjectURL(objUrl);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('image load failed')); };
    img.src = objUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadBlob(blob: Blob, path: string): Promise<string> {
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (!error && data) {
        return supabase.storage.from('avatars').getPublicUrl(data.path).data.publicUrl;
      }
      console.warn('[avatar] supabase upload failed:', error);
    } catch (e) {
      console.warn('[avatar] supabase upload error:', e);
    }
  }
  // Fallback: base64 data URL stored locally
  return blobToDataUrl(blob);
}

/** Crops + uploads student avatar, saves avatar_url to profile. Returns URL. */
export async function uploadStudentAvatar(file: File): Promise<string | null> {
  try {
    const blob = await cropToSquare(file);
    const url = await uploadBlob(blob, `students/${Date.now()}.jpg`);
    patchProfile({ avatar_url: url });
    return url;
  } catch (e) {
    console.warn('[avatar] uploadStudentAvatar failed:', e);
    return null;
  }
}

const TEACHER_KEY = 'teacher_avatar_url';

export function getTeacherAvatarUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TEACHER_KEY);
}

/** Crops + uploads teacher avatar, saves to localStorage. Returns URL. */
export async function uploadTeacherAvatar(file: File): Promise<string | null> {
  try {
    const blob = await cropToSquare(file);
    const url = await uploadBlob(blob, `teachers/${Date.now()}.jpg`);
    localStorage.setItem(TEACHER_KEY, url);
    return url;
  } catch (e) {
    console.warn('[avatar] uploadTeacherAvatar failed:', e);
    return null;
  }
}
