export const EDITOR_COMMERCE_URL = 'https://editorpro-dev.k4studios.com/admin/commerce';

export async function getEditorCommerceSession() {
  const response = await fetch('/_editorpro/session', {credentials:'same-origin',cache:'no-store',redirect:'manual'});
  if (response.status === 401) throw new Error('Sign in to EditorPro to open Commerce Admin.');
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
  const session = await response.json();
  return session?.authenticated === true ? session : null;
}

export async function commerceAdminRequest(pathname,options={}) {
  if (!pathname.startsWith('/admin/') || pathname.startsWith('//')) throw new Error('Invalid commerce action.');
  const response = await fetch(`/_editorpro/commerce${pathname}`,{
    ...options,credentials:'same-origin',cache:'no-store',redirect:'manual',
    headers:{'content-type':'application/json',...(options.headers||{})},
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error || `Commerce service returned ${response.status}.`);
  return body;
}
