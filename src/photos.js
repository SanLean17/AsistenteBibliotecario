export const MAX_PHOTO_CHARS = 600000;
export function validPhotoURL(value) {return typeof value==='string' && value.length<=MAX_PHOTO_CHARS && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value);}
// Re-encode on the device: bound dimensions/size and omit EXIF/location metadata.
export async function preparePhoto(file) {
 if(!file || file.size>20*1024*1024)throw new Error('Elegí una imagen de hasta 20 MB.');
 if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))throw new Error('Elegí una foto JPG, PNG o WebP.');
 const url=URL.createObjectURL(file);
 try {
   const image=new Image();image.src=url;
   try {await image.decode();}catch{throw new Error('No pudimos abrir esta foto. En el iPhone podés elegir una versión JPG o sacar otra foto.');}
   const ratio=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
   let dataUrl;
   for(const quality of [.82,.65,.45]){dataUrl=canvas.toDataURL('image/jpeg',quality);if(dataUrl.length<=MAX_PHOTO_CHARS)break;}
   if(!validPhotoURL(dataUrl))throw new Error('La foto es demasiado grande. Probá con una imagen más pequeña.');
   return dataUrl;
 } finally {URL.revokeObjectURL(url);}
}
